/**
 * LaTeX Generator - Convert AST to LaTeX
 * =======================================
 *
 * This module generates compilable LaTeX documents from our markdown AST.
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
 * @module ubumark/generators/latex-generator
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
} from '$lib/exercises/types';
import {
	getDimensionsForFormat,
	getAlignmentStyles
} from '$lib/exercises/services/image-dimensions';
import { expressionToLatex } from '$lib/components/markdown/utils/math-utils';
import { toFrenchDecimal } from '$lib/utils/french-math';
import { generateVariationTableLatex } from './variation-table-latex';
import { generateProbabilityTreeLatex } from './probability-tree-latex';

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
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate LaTeX document from AST
 *
 * @param ast - Document AST to generate from
 * @param options - Generator options
 * @returns Complete LaTeX document string
 *
 * @example
 * const latex = generateLatex(ast, {
 *   title: 'Exercices de Mathematiques',
 *   author: 'Prof. Dupont'
 * });
 */
export function generateLatex(ast: DocumentNode, options: LatexTranspilerOptions = {}): string {
	const opts = { ...DEFAULT_OPTIONS, ...options };

	const preamble = opts.includePreamble ? generatePreamble(opts) : '';
	const body = generateBody(ast, opts);
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
 * @param options - Generator options
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
	preamble += '\\lstset{basicstyle=\\ttfamily\\small,breaklines=true,frame=single}\n';
	preamble += '\\usepackage{tkz-tab}\n'; // For variation tables
	preamble += '\\usetikzlibrary{arrows}\n';
	preamble += '\\usepackage[normalem]{ulem}\n'; // For strikethrough (\sout{})
	preamble += '\\usepackage{soul}\n'; // For highlight (\hl{})

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
// BODY GENERATION
// ============================================================================

/**
 * Generate document body (all block nodes)
 *
 * @param ast - Document AST
 * @param options - Generator options
 * @returns LaTeX body content
 */
function generateBody(ast: DocumentNode, options: Required<LatexTranspilerOptions>): string {
	return ast.children.map((node) => generateBlock(node, options)).join('\n\n');
}

/**
 * Generate a single block node
 *
 * @param node - Block node to generate
 * @param options - Generator options
 * @returns LaTeX string for this block
 */
function generateBlock(node: BlockNode, options: Required<LatexTranspilerOptions>): string {
	switch (node.type) {
		case 'paragraph':
			return generateParagraph(node, options);

		case 'heading':
			return generateHeading(node, options);

		case 'list':
			return generateList(node, options);

		case 'table':
			return generateTable(node, options);

		case 'math-block':
			return generateMathBlock(node);

		case 'image':
			return generateImage(node, options);

		case 'horizontal-rule':
			return '\\noindent\\rule{\\textwidth}{0.4pt}';

		case 'blockquote':
			return generateBlockquote(node, options);

		case 'code-block':
			return generateCodeBlock(node);

		case 'variation-table':
			return generateVariationTableLatex(node);

		case 'probability-tree':
			return generateProbabilityTreeLatex(node);

		default:
			return '';
	}
}

// ============================================================================
// PARAGRAPH GENERATION
// ============================================================================

/**
 * Generate paragraph node
 *
 * @param node - Paragraph node
 * @param options - Generator options
 * @returns LaTeX paragraph string
 */
function generateParagraph(node: ParagraphNode, options: Required<LatexTranspilerOptions>): string {
	const content = node.children.map((child: InlineNode) => generateInline(child, options)).join('');
	return content;
}

/**
 * Generate inline node
 *
 * @param node - Inline node
 * @param options - Generator options
 * @returns LaTeX inline content
 */
function generateInline(node: InlineNode, _options: Required<LatexTranspilerOptions>): string {
	switch (node.type) {
		case 'text': {
			let text = escapeLatex(node.content);
			if (node.bold) text = `\\textbf{${text}}`;
			if (node.italic) text = `\\textit{${text}}`;
			if (node.strikethrough) text = `\\sout{${text}}`;
			if (node.highlight) text = `\\hl{${text}}`;
			if (node.code) text = `\\texttt{${text}}`;
			return text;
		}

		case 'math-inline': {
			const latex =
				node.syntax === 'custom'
					? expressionToLatex(node.expression, 'custom')
					: toFrenchDecimal(node.expression);
			return `$${latex}$`;
		}

		case 'line-break':
			return node.hard ? ' \\\\' : '\n';

		default:
			return '';
	}
}

// ============================================================================
// HEADING GENERATION
// ============================================================================

/**
 * Generate heading node
 *
 * Maps markdown heading levels to LaTeX sections:
 * - # -> \section
 * - ## -> \subsection
 * - ### -> \subsubsection
 * - #### and beyond -> \paragraph
 *
 * @param node - Heading node
 * @param options - Generator options
 * @returns LaTeX section command
 */
function generateHeading(node: HeadingNode, options: Required<LatexTranspilerOptions>): string {
	const content = node.children.map((child: InlineNode) => generateInline(child, options)).join('');

	const commands = ['section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph'];
	const command = commands[Math.min(node.level - 1, commands.length - 1)];

	return `\\${command}{${content}}`;
}

// ============================================================================
// LIST GENERATION
// ============================================================================

/**
 * Generate list node
 *
 * Uses enumerate for ordered lists, itemize for unordered lists.
 *
 * @param node - List node
 * @param options - Generator options
 * @returns LaTeX list environment
 */
function generateList(node: ListNode, options: Required<LatexTranspilerOptions>): string {
	const env = node.ordered ? 'enumerate' : 'itemize';
	const startOption = node.ordered && node.start && node.start !== 1 ? `[start=${node.start}]` : '';

	const items = node.items
		.map((item: ListItemNode) => {
			const itemContent = item.children
				.map((child: ASTNode) => {
					if (child.type === 'list') {
						return generateList(child, options);
					}
					return generateBlock(child as BlockNode, options);
				})
				.join('\n');
			return `\\item ${itemContent}`;
		})
		.join('\n');

	return `\\begin{${env}}${startOption}\n${items}\n\\end{${env}}`;
}

// ============================================================================
// TABLE GENERATION
// ============================================================================

/**
 * Generate table node
 *
 * Uses tabular environment with proper column alignment.
 *
 * @param node - Table node
 * @param options - Generator options
 * @returns LaTeX table environment
 */
function generateTable(node: TableNode, _options: Required<LatexTranspilerOptions>): string {
	const isHorizontal = node.orientation === 'horizontal';

	if (isHorizontal) {
		// Horizontal table: transpose data, first column is bold (headers)
		// First column left-aligned, rest centered
		const colSpec = 'l|' + Array(node.rows.length).fill('c').join('|');

		// Transpose: each source column becomes an output row
		const lines: string[] = [];
		for (let col = 0; col < node.header.length; col++) {
			const cells: string[] = [
				// First cell: header in bold
				`\\textbf{${escapeLatex(node.header[col].content)}}`
			];
			// Data cells from each row
			for (const row of node.rows) {
				cells.push(escapeLatex(row[col]?.content || ''));
			}
			lines.push(cells.join(' & '));
		}

		return `\\begin{tabular}{|${colSpec}|}
\\hline
${lines.join(' \\\\\n\\hline\n')} \\\\
\\hline
\\end{tabular}`;
	}

	// Standard vertical table
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

	// Generate header
	const header = node.header
		.map((cell: { content: string }) => escapeLatex(cell.content))
		.join(' & ');

	// Generate rows
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
// MATH GENERATION
// ============================================================================

/**
 * Generate math block node
 *
 * Uses \[ \] for display math.
 *
 * @param node - Math block node
 * @returns LaTeX math environment
 */
function generateMathBlock(node: MathBlockNode): string {
	const latex =
		node.syntax === 'custom'
			? expressionToLatex(node.expression, 'custom')
			: toFrenchDecimal(node.expression);
	return `\\[${latex}\\]`;
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================

/**
 * Generate image node with full multi-format sizing support
 *
 * Supports:
 * - sizeClass: Semantic sizes (inline, small, medium, large, full)
 * - widthPercent: Explicit percentage width (0-100)
 * - alignment: left, center, right positioning
 * - caption: Wraps in figure environment with \caption{}
 *
 * Output formats:
 * - Inline image: \includegraphics[height=1em]{path}
 * - Block without caption: {\centering\includegraphics[width=...]{path}\par}
 * - Block with caption: \begin{figure}...\caption{...}\end{figure}
 *
 * @param node - Image node with optional sizing attributes
 * @param options - Generator options
 * @returns LaTeX includegraphics command with proper formatting
 *
 * @example Basic image
 * ```typescript
 * generateImage({ type: 'image', src: 'fig.png' }, options);
 * // {\centering\includegraphics[width=0.5\textwidth]{fig.png}\par}
 * ```
 *
 * @example Image with caption
 * ```typescript
 * generateImage({ type: 'image', src: 'fig.png', caption: 'Figure 1' }, options);
 * // \begin{figure}[htbp]\centering\includegraphics[width=0.5\textwidth]{fig.png}\caption{Figure 1}\end{figure}
 * ```
 *
 * @example Inline image
 * ```typescript
 * generateImage({ type: 'image', src: 'icon.png', sizeClass: 'inline' }, options);
 * // \includegraphics[height=1em]{icon.png}
 * ```
 */
function generateImage(node: ImageNode, options: Required<LatexTranspilerOptions>): string {
	const imagePath = resolveImagePath(node.src, options.imageBasePath);
	const isInline = node.sizeClass === 'inline';

	// Get dimensions from the service
	const dimensions = getDimensionsForFormat(node, 'latex');

	// Build includegraphics options
	const graphicsOptions = buildGraphicsOptions(node, dimensions, isInline);

	// Build the includegraphics command
	const includegraphics = `\\includegraphics[${graphicsOptions}]{${imagePath}}`;

	// Inline images: just return the command
	if (isInline) {
		return includegraphics;
	}

	// Images with caption: use figure environment
	if (node.caption) {
		return buildFigureEnvironment(node, includegraphics);
	}

	// Block images without caption: use alignment group
	return buildAlignedImage(node, includegraphics);
}

/**
 * Build the options string for \includegraphics
 *
 * @param node - Image node for aspect ratio checks
 * @param dimensions - Computed dimensions from service
 * @param isInline - Whether this is an inline image
 * @returns Options string like "width=0.5\textwidth" or "height=1em"
 */
function buildGraphicsOptions(
	node: ImageNode,
	dimensions: { width: string; height?: string },
	isInline: boolean
): string {
	const opts: string[] = [];

	if (isInline) {
		// Inline images use height to match text
		opts.push('height=1em');
	} else {
		// Block images use width
		opts.push(`width=${dimensions.width}`);

		// Handle extreme aspect ratios to prevent overflow
		if (node.originalWidth && node.originalHeight) {
			const aspectRatio = node.originalWidth / node.originalHeight;

			// Very wide images (panoramic, >3:1): add max height to prevent tiny images
			if (aspectRatio > 3) {
				opts.push('keepaspectratio');
				opts.push('max height=0.3\\textheight');
			}
			// Very tall images (<1:3): add max width constraint
			else if (aspectRatio < 0.33) {
				opts.push('keepaspectratio');
				opts.push('max width=0.5\\textwidth');
			}
		}
	}

	return opts.join(',');
}

/**
 * Build a figure environment with caption
 *
 * @param node - Image node with caption
 * @param includegraphics - The \includegraphics command
 * @returns Complete figure environment
 */
function buildFigureEnvironment(node: ImageNode, includegraphics: string): string {
	const alignment = getAlignmentStyles(node.alignment, 'latex');
	const caption = node.caption ? `\n\\caption{${escapeLatex(node.caption)}}` : '';

	return `\\begin{figure}[htbp]
${alignment}
${includegraphics}${caption}
\\end{figure}`;
}

/**
 * Build an aligned image block without figure environment
 *
 * Uses a group with alignment command and \par for proper spacing.
 *
 * @param node - Image node
 * @param includegraphics - The \includegraphics command
 * @returns Aligned image block
 */
function buildAlignedImage(node: ImageNode, includegraphics: string): string {
	const alignment = getAlignmentStyles(node.alignment, 'latex');
	return `{${alignment}${includegraphics}\\par}`;
}

// ============================================================================
// BLOCKQUOTE GENERATION
// ============================================================================

/**
 * Generate blockquote node
 *
 * Uses the quote environment for blockquotes. Nested blockquotes
 * are supported through recursive calls.
 *
 * @param node - Blockquote node
 * @param options - Generator options
 * @returns LaTeX quote environment
 */
function generateBlockquote(
	node: BlockquoteNode,
	options: Required<LatexTranspilerOptions>
): string {
	const content = node.children.map((child) => generateBlock(child, options)).join('\n\n');

	return `\\begin{quote}\n${content}\n\\end{quote}`;
}

// ============================================================================
// CODE BLOCK GENERATION
// ============================================================================

/**
 * Generate code block node
 *
 * Uses the lstlisting environment for code blocks with optional
 * language specification for syntax highlighting.
 *
 * @param node - Code block node
 * @returns LaTeX lstlisting environment
 */
function generateCodeBlock(node: CodeBlockNode): string {
	// Map common language names to listings language identifiers
	// Fallback choices are deliberate approximations:
	// - TypeScript -> JavaScript: Similar syntax highlighting needs
	// - CSS -> HTML: Both markup-like, acceptable for styling code
	// - JSON -> JavaScript: Object notation similarities
	// - YAML -> Python: Similar block-structure highlighting
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
 * Convenience function that parses and generates in one step.
 * Useful for quick testing.
 *
 * @param markdown - Markdown text
 * @param options - Generator options
 * @returns Complete LaTeX document
 */
export async function markdownToLatex(
	markdown: string,
	options: LatexTranspilerOptions = {}
): Promise<string> {
	// Dynamic import to avoid circular dependency issues
	const { parseMarkdown } = await import('$lib/ubumark/parser/markdown-parser');
	const ast = parseMarkdown(markdown);
	return generateLatex(ast, options);
}
