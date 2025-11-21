/**
 * LaTeX Transpiler - Convert AST to LaTeX
 * ========================================
 *
 * This module transpiles our markdown AST into compilable LaTeX documents.
 *
 * Features:
 * - Full document generation with preamble
 * - Support for all AST node types
 * - Image path resolution
 * - Special character escaping
 * - Customizable options
 *
 * Output can be compiled with pdflatex, lualatex, or xelatex.
 *
 * @module exercises/transpilers/latex-transpiler
 */

import type {
	DocumentNode,
	BlockNode,
	InlineNode,
	ParagraphNode,
	HeadingNode,
	ListNode,
	TableNode,
	ListItemNode,
	ASTNode,
	MathBlockNode,
	ImageNode,
	BlockquoteNode,
	CodeBlockNode,
	LatexTranspilerOptions
} from '../types';

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_OPTIONS: Required<LatexTranspilerOptions> = {
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

// ============================================================================
// MAIN TRANSPILER FUNCTION
// ============================================================================

/**
 * Transpile AST to LaTeX document
 *
 * @param ast - Document AST to transpile
 * @param options - Transpiler options
 * @returns Complete LaTeX document string
 *
 * @example
 * const latex = transpileToLatex(ast, {
 *   title: 'Exercices de Mathématiques',
 *   author: 'Prof. Dupont'
 * });
 */
export function transpileToLatex(ast: DocumentNode, options: LatexTranspilerOptions = {}): string {
	const opts = { ...DEFAULT_OPTIONS, ...options };

	const preamble = opts.includePreamble ? generatePreamble(opts) : '';
	const body = transpileBody(ast, opts);
	const closing = opts.includePreamble ? '\n\\end{document}\n' : '';

	return preamble + body + closing;
}

// ============================================================================
// PREAMBLE GENERATION
// ============================================================================

/**
 * Generate LaTeX document preamble
 *
 * Includes:
 * - Document class and options
 * - Essential packages (amsmath, babel, inputenc, etc.)
 * - Custom packages
 * - Title and author (if provided)
 *
 * @param options - Transpiler options
 * @returns LaTeX preamble string
 */
function generatePreamble(options: Required<LatexTranspilerOptions>): string {
	const { documentClass, paperSize, fontSize, language, extraPackages, title, author } = options;

	let preamble = `\\documentclass[${fontSize},${paperSize}]{${documentClass}}\n\n`;

	// Essential packages
	preamble += '% Essential packages\n';
	preamble += '\\usepackage[utf8]{inputenc}\n';
	preamble += '\\usepackage[T1]{fontenc}\n';
	preamble += `\\usepackage[${language}]{babel}\n`;
	preamble += '\\usepackage{amsmath}\n';
	preamble += '\\usepackage{amssymb}\n';
	preamble += '\\usepackage{amsthm}\n';
	preamble += '\\usepackage{graphicx}\n';
	preamble += '\\usepackage{enumitem}\n';
	preamble += '\\usepackage{array}\n';
	preamble += '\\usepackage{booktabs}\n'; // For better tables
	preamble += '\\usepackage{geometry}\n';
	preamble += '\\geometry{margin=2cm}\n';
	preamble += '\\usepackage{listings}\n'; // For code blocks
	preamble += '\\usepackage{xcolor}\n'; // For code syntax colors
	preamble += '\\lstset{basicstyle=\\ttfamily\\small,breaklines=true,frame=single}\n\n';

	// Extra packages
	if (extraPackages.length > 0) {
		preamble += '% Additional packages\n';
		for (const pkg of extraPackages) {
			preamble += `\\usepackage{${pkg}}\n`;
		}
		preamble += '\n';
	}

	// Title and author
	if (title) {
		preamble += `\\title{${escapeLatex(title)}}\n`;
	}
	if (author) {
		preamble += `\\author{${escapeLatex(author)}}\n`;
	}
	if (title || author) {
		preamble += '\\date{\\today}\n\n';
	}

	preamble += '\\begin{document}\n\n';

	if (title || author) {
		preamble += '\\maketitle\n\n';
	}

	return preamble;
}

// ============================================================================
// BODY TRANSPILATION
// ============================================================================

/**
 * Transpile document body (all block nodes)
 *
 * @param ast - Document AST
 * @param options - Transpiler options
 * @returns LaTeX body content
 */
function transpileBody(ast: DocumentNode, options: Required<LatexTranspilerOptions>): string {
	return ast.children.map((node) => transpileBlock(node, options)).join('\n\n');
}

/**
 * Transpile a single block node
 *
 * @param node - Block node to transpile
 * @param options - Transpiler options
 * @returns LaTeX string for this block
 */
function transpileBlock(node: BlockNode, options: Required<LatexTranspilerOptions>): string {
	switch (node.type) {
		case 'paragraph':
			return transpileParagraph(node, options);

		case 'heading':
			return transpileHeading(node, options);

		case 'list':
			return transpileList(node, options);

		case 'table':
			return transpileTable(node, options);

		case 'math-block':
			return transpileMathBlock(node);

		case 'image':
			return transpileImage(node, options);

		case 'horizontal-rule':
			return '\\noindent\\rule{\\textwidth}{0.4pt}';

		case 'blockquote':
			return transpileBlockquote(node, options);

		case 'code-block':
			return transpileCodeBlock(node);

		default:
			return '';
	}
}

// ============================================================================
// PARAGRAPH TRANSPILATION
// ============================================================================

/**
 * Transpile paragraph node
 *
 * @param node - Paragraph node
 * @param options - Transpiler options
 * @returns LaTeX paragraph string
 */
function transpileParagraph(
	node: ParagraphNode,
	options: Required<LatexTranspilerOptions>
): string {
	const content = node.children
		.map((child: InlineNode) => transpileInline(child, options))
		.join('');
	return content;
}

/**
 * Transpile inline node
 *
 * @param node - Inline node
 * @param options - Transpiler options
 * @returns LaTeX inline content
 */
function transpileInline(node: InlineNode, _options: Required<LatexTranspilerOptions>): string {
	switch (node.type) {
		case 'text': {
			let text = escapeLatex(node.content);
			if (node.bold) text = `\\textbf{${text}}`;
			if (node.italic) text = `\\textit{${text}}`;
			if (node.code) text = `\\texttt{${text}}`;
			return text;
		}

		case 'math-inline':
			return `$${node.latex}$`;

		case 'line-break':
			return node.hard ? ' \\\\' : '\n';

		default:
			return '';
	}
}

// ============================================================================
// HEADING TRANSPILATION
// ============================================================================

/**
 * Transpile heading node
 *
 * Maps markdown heading levels to LaTeX sections:
 * - # → \section
 * - ## → \subsection
 * - ### → \subsubsection
 * - #### and beyond → \paragraph
 *
 * @param node - Heading node
 * @param options - Transpiler options
 * @returns LaTeX section command
 */
function transpileHeading(node: HeadingNode, options: Required<LatexTranspilerOptions>): string {
	const content = node.children
		.map((child: InlineNode) => transpileInline(child, options))
		.join('');

	const commands = ['section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph'];
	const command = commands[Math.min(node.level - 1, commands.length - 1)];

	return `\\${command}{${content}}`;
}

// ============================================================================
// LIST TRANSPILATION
// ============================================================================

/**
 * Transpile list node
 *
 * Uses enumerate for ordered lists, itemize for unordered lists.
 *
 * @param node - List node
 * @param options - Transpiler options
 * @returns LaTeX list environment
 */
function transpileList(node: ListNode, options: Required<LatexTranspilerOptions>): string {
	const env = node.ordered ? 'enumerate' : 'itemize';
	const startOption = node.ordered && node.start && node.start !== 1 ? `[start=${node.start}]` : '';

	const items = node.items
		.map((item: ListItemNode) => {
			const itemContent = item.children
				.map((child: ASTNode) => {
					if (child.type === 'list') {
						return transpileList(child, options);
					}
					return transpileBlock(child as BlockNode, options);
				})
				.join('\n');
			return `\\item ${itemContent}`;
		})
		.join('\n');

	return `\\begin{${env}}${startOption}\n${items}\n\\end{${env}}`;
}

// ============================================================================
// TABLE TRANSPILATION
// ============================================================================

/**
 * Transpile table node
 *
 * Uses tabular environment with proper column alignment.
 *
 * @param node - Table node
 * @param options - Transpiler options
 * @returns LaTeX table environment
 */
function transpileTable(node: TableNode, _options: Required<LatexTranspilerOptions>): string {
	// Generate column specification
	const colSpec = node.alignments
		.map((align: string) => {
			switch (align) {
				case 'center':
					return 'c';
				case 'right':
					return 'r';
				default:
					return 'l';
			}
		})
		.join('|');

	// Transpile header
	const header = node.header
		.map((cell: { content: string }) => escapeLatex(cell.content))
		.join(' & ');

	// Transpile rows
	const rows = node.rows
		.map((row: { content: string }[]) =>
			row.map((cell: { content: string }) => escapeLatex(cell.content)).join(' & ')
		)
		.join(' \\\\\n');

	return `\\begin{tabular}{|${colSpec}|}
\\hline
${header} \\\\
\\hline
${rows} \\\\
\\hline
\\end{tabular}`;
}

// ============================================================================
// MATH TRANSPILATION
// ============================================================================

/**
 * Transpile math block node
 *
 * Uses \[ \] for display math.
 *
 * @param node - Math block node
 * @returns LaTeX math environment
 */
function transpileMathBlock(node: MathBlockNode): string {
	return `\\[${node.latex}\\]`;
}

// ============================================================================
// IMAGE TRANSPILATION
// ============================================================================

/**
 * Transpile image node
 *
 * Uses \includegraphics with path resolution.
 *
 * @param node - Image node
 * @param options - Transpiler options
 * @returns LaTeX includegraphics command
 */
function transpileImage(node: ImageNode, options: Required<LatexTranspilerOptions>): string {
	const imagePath = resolveImagePath(node.src, options.imageBasePath);

	let latex = `\\begin{center}\n`;
	latex += `\\includegraphics[width=0.8\\textwidth]{${imagePath}}\n`;

	if (node.alt) {
		latex += `\\\\[0.5em]\n{\\small ${escapeLatex(node.alt)}}\n`;
	}

	latex += `\\end{center}`;

	return latex;
}

// ============================================================================
// BLOCKQUOTE TRANSPILATION
// ============================================================================

/**
 * Transpile blockquote node
 *
 * Uses the quote environment for blockquotes. Nested blockquotes
 * are supported through recursive calls.
 *
 * @param node - Blockquote node
 * @param options - Transpiler options
 * @returns LaTeX quote environment
 */
function transpileBlockquote(
	node: BlockquoteNode,
	options: Required<LatexTranspilerOptions>
): string {
	const content = node.children.map((child) => transpileBlock(child, options)).join('\n\n');

	return `\\begin{quote}\n${content}\n\\end{quote}`;
}

// ============================================================================
// CODE BLOCK TRANSPILATION
// ============================================================================

/**
 * Transpile code block node
 *
 * Uses the lstlisting environment for code blocks with optional
 * language specification for syntax highlighting.
 *
 * @param node - Code block node
 * @returns LaTeX lstlisting environment
 */
function transpileCodeBlock(node: CodeBlockNode): string {
	// Map common language names to listings language identifiers
	// Fallback choices are deliberate approximations:
	// - TypeScript → JavaScript: Similar syntax highlighting needs
	// - CSS → HTML: Both markup-like, acceptable for styling code
	// - JSON → JavaScript: Object notation similarities
	// - YAML → Python: Similar block-structure highlighting
	const languageMap: Record<string, string> = {
		javascript: 'JavaScript',
		typescript: 'JavaScript', // listings doesn't have TS, use JS
		js: 'JavaScript',
		ts: 'JavaScript',
		python: 'Python',
		py: 'Python',
		java: 'Java',
		c: 'C',
		cpp: 'C++',
		'c++': 'C++',
		csharp: 'CSharp',
		'c#': 'CSharp',
		ruby: 'Ruby',
		php: 'PHP',
		html: 'HTML',
		css: 'HTML', // listings doesn't have CSS
		sql: 'SQL',
		bash: 'bash',
		sh: 'bash',
		shell: 'bash',
		latex: 'TeX',
		tex: 'TeX',
		xml: 'XML',
		json: 'JavaScript', // Use JS for JSON highlighting
		yaml: 'Python', // Similar structure to Python
		go: 'Go'
	};

	// Build lstlisting options
	const langOption = node.language?.trim()
		? `language=${languageMap[node.language.toLowerCase()] || node.language}`
		: '';

	const options = langOption ? `[${langOption}]` : '';

	return `\\begin{lstlisting}${options}\n${node.code}\n\\end{lstlisting}`;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Escape special LaTeX characters
 *
 * Characters to escape: & % $ # _ { } ~ ^ \
 *
 * @param text - Text to escape
 * @returns Escaped text safe for LaTeX
 */
export function escapeLatex(text: string): string {
	const replacements: Record<string, string> = {
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

	return text.replace(/[\\&%$#_{}~^]/g, (match) => replacements[match] || match);
}

/**
 * Resolve image path for LaTeX
 *
 * Converts relative paths to absolute or keeps URL as-is.
 *
 * @param src - Image source (relative path or URL)
 * @param basePath - Base path for relative images
 * @returns Resolved image path for LaTeX
 */
export function resolveImagePath(src: string, basePath: string): string {
	// If it's a URL, can't use in LaTeX directly - would need to download
	if (src.startsWith('http://') || src.startsWith('https://')) {
		// For now, just return the filename (assumes image is downloaded)
		const filename = src.split('/').pop() || 'image';
		return basePath ? `${basePath}/${filename}` : filename;
	}

	// Relative path
	if (basePath && !src.startsWith('/')) {
		return `${basePath}/${src}`;
	}

	return src;
}

/**
 * Generate minimal LaTeX document from markdown
 *
 * Convenience function that parses and transpiles in one step.
 * Useful for quick testing.
 *
 * @param markdown - Markdown text
 * @param options - Transpiler options
 * @returns Complete LaTeX document
 */
export async function markdownToLatex(
	markdown: string,
	options: LatexTranspilerOptions = {}
): Promise<string> {
	// Dynamic import to avoid circular dependency issues
	const { parseMarkdown } = await import('../parser/markdown-parser');
	const ast = parseMarkdown(markdown);
	return transpileToLatex(ast, options);
}
