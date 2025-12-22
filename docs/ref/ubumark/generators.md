# Ubumark Generators

> LaTeX and Typst document generation from AST

---

## Table of Contents

- [Overview](#overview)
- [LaTeX Generator](#latex-generator)
- [Typst Generator](#typst-generator)
- [Special Block Export](#special-block-export)
- [LaTeX Importer](#latex-importer)
- [API Reference](#api-reference)

---

## Overview

Ubumark supports bidirectional conversion:

```
                    ┌─────────────┐
                    │   Ubumark   │
                    │  (Source)   │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│    LaTeX      │  │    Typst      │  │     HTML      │
│  (Export)     │  │   (Export)    │  │  (Rendering)  │
└───────────────┘  └───────────────┘  └───────────────┘
        │
        ▼
┌───────────────┐
│   LaTeX       │
│  (Import)     │
└───────────────┘
```

### Use Cases

1. **PDF Generation**: Export to LaTeX/Typst, compile to PDF
2. **Print Worksheets**: Generate printable exercise sheets
3. **Content Migration**: Import existing LaTeX content
4. **Backup/Archive**: Store in standard formats

---

## LaTeX Generator

### Basic Usage

```typescript
import { parseMarkdown, generateLatex } from '$lib/ubumark';

const markdown = `
# Exercice 1

Calculer $2x + 3$ pour $x = 5$.
`;

const ast = parseMarkdown(markdown);
const latex = generateLatex(ast, {
	title: 'Exercices de Mathématiques',
	author: 'Prof. Dupont'
});
```

### Output Structure

```latex
\documentclass[11pt,a4paper]{article}

% Essential packages
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[french]{babel}
\usepackage{amsmath}
\usepackage{amssymb}
\usepackage{graphicx}
\usepackage{enumitem}
\usepackage{tkz-tab}
\usepackage[normalem]{ulem}
\usepackage{soul}

\title{Exercices de Mathématiques}
\author{Prof. Dupont}
\date{\today}

\begin{document}

\maketitle

\section{Exercice 1}

Calculer $2x + 3$ pour $x = 5$.

\end{document}
```

### Options

```typescript
interface LatexTranspilerOptions {
	documentClass?: string; // 'article', 'report', 'book'
	paperSize?: string; // 'a4paper', 'letterpaper'
	fontSize?: string; // '10pt', '11pt', '12pt'
	language?: string; // 'french', 'english'
	extraPackages?: string[]; // Additional packages
	includePreamble?: boolean; // Include \documentclass, etc.
	imageBasePath?: string; // Base path for images
	title?: string; // Document title
	author?: string; // Document author
}

// Defaults
const DEFAULT_OPTIONS = {
	documentClass: 'article',
	paperSize: 'a4paper',
	fontSize: '11pt',
	language: 'french',
	extraPackages: [],
	includePreamble: true,
	imageBasePath: '',
	title: '',
	author: ''
};
```

### Node Conversions

| AST Node            | LaTeX Output                            |
| ------------------- | --------------------------------------- |
| `heading` (level 1) | `\section{...}`                         |
| `heading` (level 2) | `\subsection{...}`                      |
| `heading` (level 3) | `\subsubsection{...}`                   |
| `paragraph`         | Plain text                              |
| `math-inline`       | `$...$`                                 |
| `math-block`        | `\[...\]`                               |
| `list` (ordered)    | `\begin{enumerate}...\end{enumerate}`   |
| `list` (unordered)  | `\begin{itemize}...\end{itemize}`       |
| `table`             | `\begin{tabular}...\end{tabular}`       |
| `image`             | `\includegraphics{...}`                 |
| `code-block`        | `\begin{lstlisting}...\end{lstlisting}` |
| `blockquote`        | `\begin{quote}...\end{quote}`           |
| `horizontal-rule`   | `\noindent\rule{\textwidth}{0.4pt}`     |
| `bold`              | `\textbf{...}`                          |
| `italic`            | `\textit{...}`                          |
| `strikethrough`     | `\sout{...}`                            |
| `highlight`         | `\hl{...}`                              |
| `code` (inline)     | `\texttt{...}`                          |

### Text Escaping

Special LaTeX characters are escaped:

```typescript
function escapeLatex(text: string): string {
	const replacements = {
		'\\': '\\textbackslash{}',
		'&': '\\&',
		'%': '\\%',
		$: '\\$',
		'#': '\\#',
		_: '\\_',
		'{': '\\{',
		'}': '\\}',
		'~': '\\textasciitilde{}',
		'^': '\\textasciicircum{}'
	};
	return text.replace(/[\\&%$#_{}~^]/g, (m) => replacements[m]);
}
```

### Math Conversion

Math expressions are processed with French decimal formatting:

```typescript
// Custom syntax is converted to LaTeX
const latex =
	node.syntax === 'custom'
		? expressionToLatex(node.expression, 'custom')
		: toFrenchDecimal(node.expression);
```

Example: `2.5` becomes `2{,}5` in French LaTeX.

---

## Typst Generator

### Basic Usage

```typescript
import { parseMarkdown, generateTypst } from '$lib/ubumark';

const ast = parseMarkdown(markdown);
const typst = generateTypst(ast, {
	title: 'Exercices de Mathématiques',
	author: 'Prof. Dupont'
});
```

### Output Structure

```typst
#set document(
  title: "Exercices de Mathématiques",
  author: "Prof. Dupont",
)
#set page(paper: "a4")
#set text(lang: "fr", size: 11pt)
#set par(justify: true)
#set heading(numbering: "1.1.")

// Content starts here

= Exercice 1

Calculer $2x + 3$ pour $x = 5$.
```

### Options

```typescript
interface TypstTranspilerOptions {
	paper?: string; // 'a4', 'us-letter'
	fontSize?: string; // '10pt', '11pt', '12pt'
	language?: string; // 'fr', 'en'
	imageBasePath?: string; // Base path for images
	title?: string; // Document title
	author?: string; // Document author
	includePreamble?: boolean; // Include #set directives
}
```

### Node Conversions

| AST Node            | Typst Output              |
| ------------------- | ------------------------- |
| `heading` (level 1) | `= Title`                 |
| `heading` (level 2) | `== Title`                |
| `heading` (level 3) | `=== Title`               |
| `paragraph`         | Plain text                |
| `math-inline`       | `$...$`                   |
| `math-block`        | `$ ... $` (with newlines) |
| `list` (ordered)    | `+ Item` or `1. Item`     |
| `list` (unordered)  | `- Item`                  |
| `table`             | `#table(...)`             |
| `image`             | `#image("...")`           |
| `code-block`        | ` ```lang ... ``` `       |
| `blockquote`        | `#quote[...]`             |
| `horizontal-rule`   | `#line(length: 100%)`     |
| `bold`              | `*text*`                  |
| `italic`            | `_text_`                  |
| `strikethrough`     | `#strike[text]`           |
| `highlight`         | `#highlight[text]`        |
| `code` (inline)     | `` `code` ``              |

### Math in Typst

Typst uses different math syntax than LaTeX:

```typescript
function latexToTypst(latex: string): string {
	return latex
		.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
		.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
		.replace(/\\times/g, 'dot')
		.replace(/\\cdot/g, 'dot.c');
	// ... more conversions
}
```

---

## Special Block Export

### Variation Tables in LaTeX

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

**Required package**: `tkz-tab`

### Variation Tables in Typst

Uses custom table formatting:

```typst
#let variation-table(variable, domain, rows) = {
  table(
    columns: domain.len() + 1,
    // Header row with domain values
    [$#variable$], ..domain.map(d => [$d$]),
    // Sign and variation rows
    ..rows
  )
}
```

### Probability Trees in LaTeX

Uses `tikz` with tree library:

```latex
\begin{tikzpicture}[
  grow=right,
  level distance=3cm,
  sibling distance=2cm,
  edge from parent/.style={draw, -latex}
]
\node {Root}
  child {
    node {Event A}
    edge from parent node[above] {$P(A)$}
  }
  child {
    node {Event B}
    edge from parent node[below] {$P(B)$}
  };
\end{tikzpicture}
```

**Required packages**: `tikz` with `trees` library

### Probability Trees in Typst

Uses Typst's tree drawing capabilities:

````typst
#import "@preview/diagraph:0.2.0": *

#raw-render(
  ```dot
  digraph G {
    rankdir=LR;
    Root -> "Event A" [label="P(A)"];
    Root -> "Event B" [label="P(B)"];
  }
````

)

````

---

## LaTeX Importer

### Overview

The LaTeX importer converts LaTeX documents to Ubumark format:

```typescript
import { transpileLatexToMarkdown } from '$lib/ubumark/importers/latex';

const latex = `
\\section{Introduction}
This is \\textbf{bold} text with math: $x^2$.
`;

const result = transpileLatexToMarkdown(latex, {
  mathDelimiters: 'tilde',
  preserveComments: false
});

// result.markdown:
// # Introduction
// This is **bold** text with math: ~x^2~
````

### Options

```typescript
interface LatexToMarkdownOptions {
	preserveComments?: boolean; // Convert % comments to <!-- -->
	mathDelimiters?: 'dollar' | 'tilde' | 'brackets';
	maxNestingDepth?: number; // Prevent infinite recursion
	fallbackToText?: boolean; // Unknown commands as text
	preserveWhitespace?: boolean; // Keep original spacing
	lineOffset?: number; // For error line numbers
	additionalFunctionNames?: string[]; // Extra function names
}
```

### Supported Commands

| LaTeX Command           | Markdown Output |
| ----------------------- | --------------- |
| `\section{...}`         | `# ...`         |
| `\subsection{...}`      | `## ...`        |
| `\textbf{...}`          | `**...**`       |
| `\textit{...}`          | `*...*`         |
| `\emph{...}`            | `*...*`         |
| `\underline{...}`       | Preserved as-is |
| `\texttt{...}`          | `` `...` ``     |
| `\href{url}{text}`      | `[text](url)`   |
| `\url{...}`             | `<...>`         |
| `\includegraphics{...}` | `![](...)`      |

### Supported Environments

| LaTeX Environment | Markdown Output   |
| ----------------- | ----------------- |
| `document`        | Content only      |
| `itemize`         | `- Item`          |
| `enumerate`       | `1. Item`         |
| `tabular`         | GFM table         |
| `verbatim`        | ` ``` ``` `       |
| `quote`           | `> ...`           |
| `equation`        | `$$ ... $$`       |
| `align`           | Preserved in math |

### Math Conversion

When `mathDelimiters: 'tilde'`, the importer attempts to convert LaTeX math to custom syntax:

```typescript
const result = convertMathToCustomSyntax(latex, context);
if (result.converted) {
	// Use ~...~ or ~~...~~
	return customSyntax(result.output);
} else {
	// Keep $...$ or $$...$$
	return latexSyntax(result.output);
}
```

Complex expressions that can't be converted remain in LaTeX.

### Warnings and Errors

```typescript
interface TranspileResult {
	markdown: string;
	warnings: TranspileWarning[];
	stats: TranspileStats;
}

interface TranspileWarning {
	type: 'unsupported-command' | 'unsupported-environment' | 'nested-too-deep';
	message: string;
	severity: 'warning' | 'error';
	line?: number;
	column?: number;
}
```

---

## API Reference

### LaTeX Generator

```typescript
// Generate complete LaTeX document
function generateLatex(ast: DocumentNode, options?: LatexTranspilerOptions): string;

// Generate without preamble (body only)
function generateLatexBody(ast: DocumentNode, options?: LatexTranspilerOptions): string;

// Escape text for LaTeX
function escapeLatex(text: string): string;

// Resolve image path
function resolveImagePath(src: string, basePath: string): string;

// Convenience: markdown to LaTeX
async function markdownToLatex(markdown: string, options?: LatexTranspilerOptions): Promise<string>;
```

### Typst Generator

```typescript
// Generate complete Typst document
function generateTypst(ast: DocumentNode, options?: TypstTranspilerOptions): string;

// Generate without preamble
function generateTypstBody(ast: DocumentNode, options?: TypstTranspilerOptions): string;

// Escape text for Typst
function escapeTypst(text: string): string;

// Convenience: markdown to Typst
async function markdownToTypst(markdown: string, options?: TypstTranspilerOptions): Promise<string>;
```

### LaTeX Importer

```typescript
// Main transpiler function
function transpileLatexToMarkdown(latex: string, options?: LatexToMarkdownOptions): TranspileResult;

// Tokenize LaTeX
function tokenize(latex: string): LatexToken[];

// Convert single token
function convertToken(token: LatexToken, context: ConversionContext): string;
```

---

## Best Practices

### Image Handling

For LaTeX/Typst export, ensure images are accessible:

```typescript
// Set base path for images
const latex = generateLatex(ast, {
	imageBasePath: './images'
});
```

**Tip**: Download remote images before compilation.

### Complex Math

For complex expressions not supported by custom syntax:

```typescript
// Use LaTeX syntax directly
const markdown = `
$$
\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}
$$
`;
```

These are preserved as-is in export.

### Document Structure

For best export results:

1. Use proper heading hierarchy
2. Avoid deeply nested lists (>3 levels)
3. Use standard table formatting
4. Keep code blocks simple

### Import Cleanup

After importing LaTeX:

1. Review warnings for unsupported commands
2. Check math conversion accuracy
3. Verify image paths
4. Test rendering before committing
