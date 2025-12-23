/**
 * Typst Generator - Convert AST to Typst
 * =======================================
 *
 * This module generates compilable Typst documents from our markdown AST.
 * Typst is a modern typesetting system that combines simplicity with power.
 *
 * Features:
 * - Full document generation with setup
 * - Support for all AST node types
 * - Image path resolution
 * - Special character escaping
 * - Customizable options
 * - French number formatting (comma decimal, thin spaces)
 *
 * ## French Decimal Handling
 *
 * Numbers are displayed in French notation:
 * - Comma as decimal separator: 3,14 (not 3.14)
 * - Thin spaces for digit grouping: 1 234 567
 *
 * The conversion flow:
 * 1. Source markdown uses standard notation: 3.14
 * 2. math-utils.ts converts to LaTeX French: 3{,}14, 1\,234
 * 3. This generator converts to Typst:
 *    - {,} → "," (string for literal comma without separator spacing)
 *    - \, → thin (Typst thin space keyword)
 *
 * Why use "," (string) for decimal comma:
 * - In Typst math mode, bare comma is an argument separator with spacing
 * - String "," displays as literal comma without extra spacing
 * - This preserves proper spacing for argument separators like (a, b, c)
 *
 * @see https://github.com/typst/typst/issues/5272 - Typst decimal separator discussion
 * @module ubumark/generators/typst-generator
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
	MathBlockNode,
	ImageNode,
	BlockquoteNode,
	CodeBlockNode,
	TypstTranspilerOptions
} from '$lib/exercises/types';
import { getDimensionsForFormat } from '$lib/exercises/services/image-dimensions';
import { expressionToLatex } from '$lib/components/markdown/utils/math-utils';
import { toFrenchDecimal } from '$lib/utils/french-math';
import { generateVariationTableTypst } from './variation-table-typst';
import { generateProbabilityTreeTypst } from './probability-tree-typst';
import type { VariationTableNode } from '../types/variation-table';
import type { ProbabilityTreeNode } from '../types/probability-tree';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('typst-generator');

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_OPTIONS: Required<TypstTranspilerOptions> = {
	paperSize: 'a4',
	fontSize: 11,
	language: 'fr',
	imageBasePath: '',
	includeSetup: true,
	title: '',
	author: ''
};

// ============================================================================
// ESCAPE SEQUENCE HANDLING
// ============================================================================

/**
 * Regex to match markdown escape sequences: \* \_ \` \\
 */
const MARKDOWN_ESCAPE_REGEX = /\\([*_`\\])/g;

/**
 * Unescape markdown escape sequences fully
 *
 * Handles multiple levels of escaping by looping until no more changes.
 * This is necessary because source markdown may have double-escaped sequences
 * like \\* which need multiple passes to fully unescape.
 *
 * @param text - Text containing escape sequences
 * @returns Text with all escape sequences resolved
 *
 * @example
 * unescapeMarkdown('10\\*\\*(-4)') // Returns '10**(-4)'
 * unescapeMarkdown('10\\\\*\\\\*(-4)') // Returns '10**(-4)' (double backslash)
 */
function unescapeMarkdown(text: string): string {
	let result = text;
	let prev = '';
	// Loop until no more changes (handles multiple escape levels)
	while (result !== prev) {
		prev = result;
		result = result.replace(MARKDOWN_ESCAPE_REGEX, '$1');
	}
	return result;
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate Typst document from AST
 *
 * @param ast - Document AST to generate from
 * @param options - Generator options
 * @returns Complete Typst document string
 *
 * @example
 * const typst = generateTypst(ast, {
 *   title: 'Exercices de Mathematiques',
 *   author: 'Prof. Dupont'
 * });
 */
export function generateTypst(ast: DocumentNode, options: TypstTranspilerOptions = {}): string {
	const opts = { ...DEFAULT_OPTIONS, ...options };

	const setup = opts.includeSetup ? generateSetup(opts) : '';
	const body = generateBody(ast, opts);

	return setup + body;
}

// ============================================================================
// SETUP GENERATION
// ============================================================================

/**
 * Generate Typst document setup
 *
 * Includes:
 * - Page size configuration
 * - Font size
 * - Language settings
 * - Title and author (if provided)
 *
 * @param options - Generator options
 * @returns Typst setup string
 */
function generateSetup(options: Required<TypstTranspilerOptions>): string {
	const { paperSize, fontSize, language, title, author } = options;

	let setup = `#set page(paper: "${paperSize}")\n`;
	setup += `#set text(font: "New Computer Modern", size: ${fontSize}pt, lang: "${language}")\n`;
	setup += '#set par(justify: true)\n';
	setup += '#set heading(numbering: "1.1")\n';

	// List item spacing (numbering is set per-list via #enum())
	setup += '#set enum(spacing: 1.5em, tight: false)\n';
	setup += '#set list(spacing: 2em, tight: false)\n';

	// Display limits above/below for common operators (like LaTeX display mode)
	setup += '#show math.sum: math.limits\n';
	setup += '#show math.product: math.limits\n';
	setup += '#show math.integral: math.limits.with(inline: false)\n';

	// Redefine operators with limits: true (Typst defaults to false)
	setup += '#let lim = math.op("lim", limits: true)\n';
	setup += '#let limsup = math.op("lim sup", limits: true)\n';
	setup += '#let liminf = math.op("lim inf", limits: true)\n';
	setup += '#let max = math.op("max", limits: true)\n';
	setup += '#let min = math.op("min", limits: true)\n';
	setup += '#let sup = math.op("sup", limits: true)\n';
	setup += '#let inf = math.op("inf", limits: true)\n\n';

	// Title block
	if (title || author) {
		if (title) {
			setup += `#align(center, text(17pt, weight: "bold")[${escapeTypst(title)}])\n`;
		}
		if (author) {
			setup += `#align(center, text(12pt)[${escapeTypst(author)}])\n`;
		}
		setup += '#v(1em)\n\n';
	}

	return setup;
}

// ============================================================================
// BODY GENERATION
// ============================================================================

/**
 * Generate document body (all block nodes)
 *
 * @param ast - Document AST
 * @param options - Generator options
 * @returns Typst body content
 */
function generateBody(ast: DocumentNode, options: Required<TypstTranspilerOptions>): string {
	return ast.children.map((node) => generateBlock(node, options)).join('\n\n');
}

/**
 * Generate a single block node
 *
 * @param node - Block node to generate
 * @param options - Generator options
 * @returns Typst string for this block
 */
function generateBlock(node: BlockNode, options: Required<TypstTranspilerOptions>): string {
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
			return transpileImage(node, options);

		case 'horizontal-rule':
			return '#line(length: 100%)';

		case 'blockquote':
			return generateBlockquote(node, options);

		case 'code-block':
			return generateCodeBlock(node);

		case 'variation-table':
			return generateVariationTableTypst(node as unknown as VariationTableNode);

		case 'probability-tree':
			return generateProbabilityTreeTypst(node as unknown as ProbabilityTreeNode);

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
 * @returns Typst paragraph string
 */
function generateParagraph(node: ParagraphNode, options: Required<TypstTranspilerOptions>): string {
	const content = node.children.map((child: InlineNode) => generateInline(child, options)).join('');
	return content;
}

/**
 * Generate inline node
 *
 * @param node - Inline node
 * @param options - Generator options
 * @returns Typst inline content
 */
function generateInline(node: InlineNode, _options: Required<TypstTranspilerOptions>): string {
	switch (node.type) {
		case 'text': {
			// Unescape markdown escape sequences (handles multiple levels like \\*)
			const unescapedContent = unescapeMarkdown(node.content);

			// For inline code, don't escape - Typst raw text preserves content as-is
			if (node.code) {
				return `\`${unescapedContent}\``;
			}

			// For regular text, escape special Typst characters
			let text = escapeTypst(unescapedContent);
			if (node.bold) text = `*${text}*`;
			if (node.italic) text = `_${text}_`;
			if (node.strikethrough) text = `#strike[${text}]`;
			if (node.highlight) text = `#highlight[${text}]`;
			return text;
		}

		case 'math-inline': {
			const latex =
				node.syntax === 'custom'
					? expressionToLatex(node.expression, 'custom')
					: toFrenchDecimal(node.expression);
			// Convert LaTeX math to Typst math syntax
			const typstMath = convertLatexToTypstMath(latex);

			// Check if math contains operators that need display mode for proper limit rendering
			// Note: Can't use \b word boundary because _ is a word character (lim_ has no boundary)
			const needsDisplayMode =
				/(^|[^a-zA-Z])(lim|limsup|liminf|sum|prod|product|max|min|sup|inf)([^a-zA-Z]|$)/.test(
					typstMath
				);
			if (needsDisplayMode) {
				return `$display(${typstMath})$`;
			}
			return `$${typstMath}$`;
		}

		case 'line-break':
			return node.hard ? ' \\\n' : '\n';

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
 * Maps markdown heading levels to Typst headings:
 * - # -> = Heading
 * - ## -> == Heading
 * - ### -> === Heading
 * - etc.
 *
 * @param node - Heading node
 * @param options - Generator options
 * @returns Typst heading
 */
function generateHeading(node: HeadingNode, options: Required<TypstTranspilerOptions>): string {
	const content = node.children.map((child: InlineNode) => generateInline(child, options)).join('');

	const prefix = '='.repeat(node.level);

	return `${prefix} ${content}`;
}

// ============================================================================
// LIST GENERATION
// ============================================================================

/**
 * Numbering patterns for French academic style (1) a) i))
 */
const ENUM_NUMBERING_PATTERNS = ['1)', 'a)', 'i)', '1)'];

/**
 * Get numbering pattern for a given enumerate depth
 */
function getNumberingPattern(depth: number): string {
	return ENUM_NUMBERING_PATTERNS[Math.min(depth - 1, ENUM_NUMBERING_PATTERNS.length - 1)];
}

/**
 * Generate list node with depth tracking for proper numbering
 *
 * Uses numbered lists for ordered, bullet lists for unordered.
 * Ordered lists use the French academic style: 1) a) i)
 *
 * @param node - List node
 * @param options - Generator options
 * @param enumerateDepth - Current enumerate depth (only increments for ordered lists)
 * @returns Typst list
 */
function generateList(
	node: ListNode,
	options: Required<TypstTranspilerOptions>,
	enumerateDepth: number = 0
): string {
	// Calculate new depth: only ordered lists increment enumerate depth
	const newDepth = node.ordered ? enumerateDepth + 1 : enumerateDepth;
	const startNumber = node.start ?? 1;

	// For ordered lists, use #enum() to ensure proper numbering at all levels
	if (node.ordered) {
		const pattern = getNumberingPattern(newDepth);
		const enumItems = node.items
			.map((item: ListItemNode) => {
				const content = generateListItemContent(item, options, newDepth);
				return `[${content}]`;
			})
			.join(',\n  ');

		// Include start parameter only if not starting at 1
		const startParam = startNumber !== 1 ? `start: ${startNumber}, ` : '';
		return `#enum(${startParam}numbering: "${pattern}",\n  ${enumItems}\n)`;
	}

	// For bullet lists, use #list() with explicit spacing between items
	const listItems = node.items
		.map((item: ListItemNode) => {
			const content = generateListItemContent(item, options, newDepth);
			return `[${content}]`;
		})
		.join(',\n  ');

	return `#list(spacing: 1.5em,\n  ${listItems}\n)`;
}

/**
 * Generate content for a list item, handling nested lists and multiple blocks
 */
function generateListItemContent(
	item: ListItemNode,
	options: Required<TypstTranspilerOptions>,
	currentDepth: number
): string {
	const blocks: string[] = [];

	for (let i = 0; i < item.children.length; i++) {
		const child = item.children[i];

		if (child.type === 'list') {
			// Nested list - generate with current depth
			const listContent = generateList(child, options, currentDepth);
			// Add blank line before nested list if there's content before it
			if (blocks.length > 0) {
				blocks.push('\n' + listContent);
			} else {
				blocks.push(listContent);
			}
		} else {
			// Regular block (paragraph, math, etc.)
			const blockContent = generateBlock(child as BlockNode, options);

			// Add blank line between paragraphs to preserve line breaks
			if (i > 0 && item.children[i - 1].type !== 'list') {
				blocks.push('\n' + blockContent);
			} else {
				blocks.push(blockContent);
			}
		}
	}

	return blocks.join('\n');
}

// ============================================================================
// TABLE GENERATION
// ============================================================================

/**
 * Generate table node
 *
 * Uses Typst's table function with proper column alignment.
 *
 * @param node - Table node
 * @param options - Generator options
 * @returns Typst table
 */
function generateTable(node: TableNode, _options: Required<TypstTranspilerOptions>): string {
	const numCols = node.header.length;

	// Map alignments
	const alignments = node.alignments.map((align: string) => {
		switch (align) {
			case 'center':
				return 'center';
			case 'right':
				return 'right';
			default:
				return 'left';
		}
	});

	// Build header cells
	const headerCells = node.header
		.map((cell: { content: string }) => `[*${escapeTypst(cell.content)}*]`)
		.join(', ');

	// Build body rows
	const bodyRows = node.rows
		.map((row: { content: string }[]) =>
			row.map((cell: { content: string }) => `[${escapeTypst(cell.content)}]`).join(', ')
		)
		.join(',\n  ');

	return `#table(
  columns: ${numCols},
  align: (${alignments.join(', ')}),
  table.header(${headerCells}),
  ${bodyRows}
)`;
}

// ============================================================================
// MATH GENERATION
// ============================================================================

/**
 * Pattern to match alignment symbols in LaTeX align environments.
 * Matches: \Rightarrow, \Leftrightarrow, =, <, >, \leq, \geq, \neq, etc.
 */
const ALIGNMENT_SYMBOL_PATTERN =
	/^(\\(Rightarrow|Leftarrow|Leftrightarrow|iff|implies|impliedby|leq|geq|leqslant|geqslant|neq|ne|lt|gt|le|ge)|[=<>])/;

/**
 * Generate math block node
 *
 * Uses $ ... $ with display modifier for block math.
 * For aligned equations (align, aligned, etc.), uses a grid for proper alignment.
 *
 * @param node - Math block node
 * @returns Typst math block
 */
function generateMathBlock(node: MathBlockNode): string {
	const latex =
		node.syntax === 'custom'
			? expressionToLatex(node.expression, 'custom')
			: toFrenchDecimal(node.expression);

	// Check if this is an aligned equation (contains \begin{align} etc.)
	const alignMatch = latex.match(/\\begin\s*\{(align|aligned)\*?\}([\s\S]*?)\\end\s*\{\1\*?\}/);

	if (alignMatch) {
		return generateAlignedEquation(alignMatch[2]);
	}

	// Convert LaTeX math to Typst math syntax
	const typstMath = convertLatexToTypstMath(latex);

	// For simple equations, wrap in align(center) to ensure centering inside lists
	return `#align(center)[$ ${typstMath} $]`;
}

/**
 * Generate aligned equation using Typst grid for proper alignment
 *
 * Detects implication/equivalence chains and generates a 4-column grid:
 * - Column 1: Initial expression (only first row), right-aligned
 * - Column 2: Logical symbol (⇒, ⇔, etc.), centered
 * - Column 3: Result expression, left-aligned
 * - Column 4: Explanatory text, left-aligned
 *
 * @param content - Content inside \begin{align}...\end{align}
 * @returns Typst grid structure
 */
function generateAlignedEquation(content: string): string {
	// Protect nested environments (cases, matrix, etc.) before splitting by \\
	// These environments contain \\ that should NOT be treated as row separators
	const nestedEnvs: string[] = [];
	const protectedContent = content.replace(
		/\\begin\s*\{(cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\}[\s\S]*?\\end\s*\{\1\}/g,
		(match) => {
			nestedEnvs.push(match);
			return `__NESTED_ENV_${nestedEnvs.length - 1}__`;
		}
	);

	// Split by \\ to get rows
	const rows = protectedContent
		.split(/\\\\/)
		.map((row) => row.trim())
		.filter((row) => row.length > 0)
		// Restore nested environments
		.map((row) => row.replace(/__NESTED_ENV_(\d+)__/g, (_, idx) => nestedEnvs[parseInt(idx)]));

	if (rows.length === 0) {
		return '';
	}

	// Check if this uses alignment symbols (implications, equivalences, equations, inequations)
	const hasAlignmentSymbol = rows.some((row) => {
		const parts = row.split('&');
		if (parts.length >= 2) {
			const rightPart = parts[1].trim();
			return ALIGNMENT_SYMBOL_PATTERN.test(rightPart);
		}
		return false;
	});

	if (hasAlignmentSymbol) {
		return generateAlignedGrid(rows);
	}

	// Fallback to simple 2-column grid for other align environments
	return generateSimpleAlignGrid(rows);
}

/**
 * Generate 4-column grid for aligned equations (implications, equivalences, equations, inequations)
 */
function generateAlignedGrid(rows: string[]): string {
	const gridRows: string[] = [];

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const parts = row.split('&').map((p) => p.trim());

		// Column 1: Initial expression (only first row) - use inline math
		const col1 = i === 0 && parts[0] ? `[$${convertLatexToTypstMath(parts[0])}$]` : '[]';

		if (parts.length >= 2) {
			const rightPart = parts.slice(1).join('&').trim();

			// Extract alignment symbol (=, <, >, \Rightarrow, \leq, etc.)
			const symbolMatch = rightPart.match(ALIGNMENT_SYMBOL_PATTERN);
			let col2 = '[]';
			let restOfRight = rightPart;

			if (symbolMatch) {
				const symbol = symbolMatch[0];
				col2 = `[$${convertLatexToTypstMath(symbol)}$]`;
				restOfRight = rightPart.slice(symbol.length).trim();
			}

			// Extract explanatory text (after \quad or \qquad followed by \text)
			// Pattern: expression \quad \text{...} or expression \quad "text" $math$ "text"
			const textPattern = /\\q?quad\s*(\\text\s*\{[^}]*\}.*|.*)$/;
			const textMatch = restOfRight.match(textPattern);

			let col3Content = restOfRight;
			let col4Content = '';

			if (textMatch) {
				// Find where the \quad starts
				const quadIndex = restOfRight.search(/\\q?quad/);
				if (quadIndex !== -1) {
					col3Content = restOfRight.slice(0, quadIndex).trim();
					col4Content = restOfRight.slice(quadIndex).trim();
					// Remove the \quad/\qquad prefix from the text
					col4Content = col4Content.replace(/^\\q?quad\s*/, '');
				}
			}

			// Column 3: use inline math $...$ (no spaces) to avoid centering behavior
			const col3 = col3Content ? `[$${convertLatexToTypstMath(col3Content)}$]` : '[]';
			// Column 4: add left padding with #h(1em) for visual separation
			const col4 = col4Content ? `[#h(1em)$${convertLatexToTypstMath(col4Content)}$]` : '[]';

			gridRows.push(`  ${col1}, ${col2}, ${col3}, ${col4}`);
		} else {
			// No alignment point - put everything in column 3
			const mathPart = parts[0] ? convertLatexToTypstMath(parts[0]) : '';
			gridRows.push(`  ${col1}, [], [$${mathPart}$], []`);
		}
	}

	return `#align(center)[#grid(
  columns: (auto, auto, auto, auto),
  column-gutter: 0.5em,
  row-gutter: 1em,
  align: (right + horizon, center + horizon, left + horizon, left + horizon),
${gridRows.join(',\n')}
)]`;
}

/**
 * Generate simple 2-column grid for align environments without alignment symbols
 */
function generateSimpleAlignGrid(rows: string[]): string {
	const gridRows: string[] = [];

	for (const row of rows) {
		const parts = row.split('&').map((p) => p.trim());

		if (parts.length >= 2) {
			const leftPart = convertLatexToTypstMath(parts[0]);
			const rightPart = convertLatexToTypstMath(parts.slice(1).join('&'));
			// Use inline math $...$ (no spaces) to avoid centering
			gridRows.push(`  [$${leftPart}$], [$${rightPart}$]`);
		} else {
			const mathPart = convertLatexToTypstMath(parts[0]);
			gridRows.push(`  grid.cell(colspan: 2)[$${mathPart}$]`);
		}
	}

	return `#align(center)[#grid(
  columns: (auto, auto),
  column-gutter: 0.5em,
  row-gutter: 1em,
  align: (right + horizon, left + horizon),
${gridRows.join(',\n')}
)]`;
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
 * - caption: Wraps in #figure() with caption
 *
 * Output formats:
 * - Inline image: #box(height: 1em)[#image("path")]
 * - Block without caption: #align(center)[#image("path", width: 50%)]
 * - Block with caption: #figure(image("path", width: 50%), caption: [caption])
 *
 * @param node - Image node with optional sizing attributes
 * @param options - Generator options
 * @returns Typst image command with proper formatting
 *
 * @example Basic image
 * ```typescript
 * transpileImage({ type: 'image', src: 'fig.png' }, options);
 * // #align(center)[#image("fig.png", width: 50%)]
 * ```
 *
 * @example Image with caption
 * ```typescript
 * transpileImage({ type: 'image', src: 'fig.png', caption: 'Figure 1' }, options);
 * // #figure(image("fig.png", width: 50%), caption: [Figure 1])
 * ```
 *
 * @example Inline image
 * ```typescript
 * transpileImage({ type: 'image', src: 'icon.png', sizeClass: 'inline' }, options);
 * // #box(height: 1em)[#image("icon.png")]
 * ```
 */
export function transpileImage(node: ImageNode, options: Required<TypstTranspilerOptions>): string {
	const imagePath = resolveImagePath(node.src, options.imageBasePath);
	const isInline = node.sizeClass === 'inline';

	// Get dimensions from the service
	const dimensions = getDimensionsForFormat(node, 'typst');

	// Build the image command
	const imageCommand = buildImageCommand(node, imagePath, dimensions, isInline);

	// Inline images: wrap in box for text alignment
	if (isInline) {
		return `#box(height: 1em)[#image("${imagePath}")]`;
	}

	// Images with caption: use figure function
	if (node.caption) {
		return buildFigure(node, imagePath, dimensions);
	}

	// Block images without caption: use alignment wrapper
	return buildAlignedImage(node, imageCommand);
}

/**
 * Build the image command with width options
 *
 * @param node - Image node for aspect ratio checks
 * @param imagePath - Resolved image path
 * @param dimensions - Computed dimensions from service
 * @param isInline - Whether this is an inline image
 * @returns Image command string
 */
function buildImageCommand(
	node: ImageNode,
	imagePath: string,
	dimensions: { width: string; height?: string },
	isInline: boolean
): string {
	if (isInline) {
		return `#image("${imagePath}")`;
	}

	const opts: string[] = [];

	// Add width
	opts.push(`width: ${dimensions.width}`);

	// Handle extreme aspect ratios to prevent overflow
	if (node.originalWidth && node.originalHeight) {
		const aspectRatio = node.originalWidth / node.originalHeight;

		// Very wide images (panoramic, >3:1): add max height
		if (aspectRatio > 3) {
			opts.push('height: auto');
		}
		// Very tall images (<1:3): constrain width further
		else if (aspectRatio < 0.33) {
			// Override width for very tall images
			opts[0] = 'width: 50%';
		}
	}

	return `#image("${imagePath}", ${opts.join(', ')})`;
}

/**
 * Build a figure with caption
 *
 * @param node - Image node with caption
 * @param imagePath - Resolved image path
 * @param dimensions - Computed dimensions
 * @returns Complete figure command
 */
function buildFigure(node: ImageNode, imagePath: string, dimensions: { width: string }): string {
	const caption = escapeTypstBrackets(node.caption || '');

	// Build image options
	const imageOpts: string[] = [`width: ${dimensions.width}`];

	// Handle extreme aspect ratios
	if (node.originalWidth && node.originalHeight) {
		const aspectRatio = node.originalWidth / node.originalHeight;
		if (aspectRatio < 0.33) {
			imageOpts[0] = 'width: 50%';
		}
	}

	return `#figure(
  image("${imagePath}", ${imageOpts.join(', ')}),
  caption: [${caption}]
)`;
}

/**
 * Build an aligned image block without figure
 *
 * @param node - Image node
 * @param imageCommand - The #image() command
 * @returns Aligned image block
 */
function buildAlignedImage(node: ImageNode, imageCommand: string): string {
	const alignment = node.alignment || 'center';
	return `#align(${alignment})[${imageCommand}]`;
}

// ============================================================================
// BLOCKQUOTE GENERATION
// ============================================================================

/**
 * Generate blockquote node
 *
 * Uses Typst's #quote block with block: true for block quotes.
 *
 * @param node - Blockquote node
 * @param options - Generator options
 * @returns Typst quote block
 */
function generateBlockquote(
	node: BlockquoteNode,
	options: Required<TypstTranspilerOptions>
): string {
	const content = node.children.map((child) => generateBlock(child, options)).join('\n\n');

	return `#quote(block: true)[${content}]`;
}

// ============================================================================
// CODE BLOCK GENERATION
// ============================================================================

/**
 * Generate code block node
 *
 * Uses Typst's raw block with language specification.
 *
 * @param node - Code block node
 * @returns Typst raw block
 */
function generateCodeBlock(node: CodeBlockNode): string {
	// Don't include language to avoid syntax highlighting in PDF output
	// Unescape markdown escape sequences (handles multiple levels like \\*)
	const cleanedCode = unescapeMarkdown(node.code);
	return '```\n' + cleanedCode + '\n```';
}

// ============================================================================
// LATEX TO TYPST MATH CONVERSION
// ============================================================================

/**
 * Find the matching closing brace for an opening brace at the given position.
 * Handles nested braces properly.
 *
 * @param str - The string to search in
 * @param openPos - Position of the opening brace
 * @returns Position of the matching closing brace, or -1 if not found
 */
function findMatchingBrace(str: string, openPos: number): number {
	if (str[openPos] !== '{') return -1;
	let depth = 1;
	let i = openPos + 1;
	while (i < str.length && depth > 0) {
		if (str[i] === '{') depth++;
		else if (str[i] === '}') depth--;
		i++;
	}
	return depth === 0 ? i - 1 : -1;
}

/**
 * Convert a LaTeX command with one braced argument to a Typst function
 * Handles nested braces properly
 *
 * @param str - Input string
 * @param latexCmd - LaTeX command without backslash (e.g., "mathcal")
 * @param typstFunc - Typst function name (e.g., "cal")
 * @returns String with command converted
 */
function convertLatexOneArgCommand(str: string, latexCmd: string, typstFunc: string): string {
	let result = str;

	// First, handle \command{...} syntax (with braces)
	const bracePattern = new RegExp(`\\\\${latexCmd}\\s*\\{`, 'g');
	let match;

	let changed = true;
	while (changed) {
		changed = false;
		bracePattern.lastIndex = 0;

		while ((match = bracePattern.exec(result)) !== null) {
			const startIndex = match.index;
			const openBraceIndex = match.index + match[0].length - 1;

			// Find matching closing brace
			const closeIndex = findMatchingBrace(result, openBraceIndex);
			if (closeIndex === -1) continue;

			const content = result.slice(openBraceIndex + 1, closeIndex);

			// Replace the whole \command{...} with func(...)
			const replacement = `${typstFunc}(${content})`;
			result = result.slice(0, startIndex) + replacement + result.slice(closeIndex + 1);

			changed = true;
			bracePattern.lastIndex = 0;
			break;
		}
	}

	// Second, handle \command X syntax (space + single character, no braces)
	// This is valid LaTeX syntax for single-character arguments
	// Match: \mathcal followed by space(s) then a single letter (not followed by another letter)
	const spacePattern = new RegExp(`\\\\${latexCmd}\\s+([A-Za-z])(?![A-Za-z])`, 'g');
	result = result.replace(spacePattern, `${typstFunc}($1)`);

	return result;
}

/**
 * Convert LaTeX \frac{...}{...} and \dfrac{...}{...} to Typst frac(..., ...)
 * Handles nested braces properly (e.g., \dfrac{(-1)^{n+1}}{u^2_n})
 *
 * @param str - Input string
 * @returns String with fractions converted
 */
function convertLatexFractions(str: string): string {
	let result = str;
	const fracPattern = /\\d?frac\s*\{/g;
	let match;

	// Keep converting until no more matches (handles nested fractions)
	let changed = true;
	while (changed) {
		changed = false;
		fracPattern.lastIndex = 0;

		while ((match = fracPattern.exec(result)) !== null) {
			const startIndex = match.index;
			const openBraceIndex = match.index + match[0].length - 1;

			// Find matching closing brace for numerator
			const numEnd = findMatchingBrace(result, openBraceIndex);
			if (numEnd === -1) continue;

			const numerator = result.slice(openBraceIndex + 1, numEnd);

			// Skip whitespace and find denominator
			let i = numEnd + 1;
			while (i < result.length && /\s/.test(result[i])) i++;

			if (result[i] !== '{') continue;

			const denomStart = i;
			const denomEnd = findMatchingBrace(result, denomStart);
			if (denomEnd === -1) continue;

			const denominator = result.slice(denomStart + 1, denomEnd);

			// Replace the whole \frac{...}{...} with frac(...)
			const replacement = 'frac(' + numerator + ', ' + denominator + ')';
			result = result.slice(0, startIndex) + replacement + result.slice(denomEnd + 1);

			changed = true;
			// Reset and start over since string changed
			fracPattern.lastIndex = 0;
			break;
		}
	}

	return result;
}

/**
 * Convert LaTeX math to Typst math syntax
 *
 * Typst uses different syntax than LaTeX for math mode.
 * This function converts common LaTeX math commands to Typst equivalents.
 *
 * @param latex - LaTeX math expression
 * @returns Typst math expression
 */
/**
 * Replace LaTeX command with Typst equivalent, adding spaces to prevent
 * variable name fusion like "xtimes" or "times0" or "times(" being parsed as function.
 */
function replaceLatexCmd(str: string, latexCmd: string, typstCmd: string): string {
	// Pattern: \command not followed by letter (to avoid partial matches)
	const pattern = new RegExp(`\\\\${latexCmd}(?![a-zA-Z])`, 'g');

	return str.replace(pattern, (match, offset) => {
		let result = typstCmd;

		// Add space BEFORE if preceded by a letter (prevents "xtimes")
		if (offset > 0 && /[a-zA-Z]/.test(str[offset - 1])) {
			result = ' ' + result;
		}

		// Add space AFTER if followed by digit or open paren
		// - digit: prevents "times0" being parsed as variable
		// - paren: prevents "times(...)" being parsed as function call
		const afterPos = offset + match.length;
		if (afterPos < str.length && /[\d(]/.test(str[afterPos])) {
			result = result + ' ';
		}

		return result;
	});
}

export function convertLatexToTypstMath(latex: string): string {
	let result = latex;

	// Debug: log if we have mathcal that might not be converted
	if (result.includes('mathcal')) {
		logger.trace('convertLatexToTypstMath: input contains mathcal', {
			preview: result.slice(0, 200)
		});
	}

	// ========================================================================
	// FRENCH DECIMAL COMMA HANDLING (Step 1 of 2)
	// ========================================================================
	// LaTeX {,} represents a French decimal comma (from french-math.ts).
	// We use a placeholder here because:
	// 1. LaTeX \, (thin space) will be converted to Typst "thin" later
	// 2. {,} must become "," (string) in Typst for proper display
	// The placeholder avoids conflicts between these two conversions.
	// Final replacement happens at the end of this function (Step 2).
	result = result.replace(/\{,\}/g, '<<<DECIMAL_COMMA>>>');

	// Convert \left( ... \right) to ( ... ) - Typst auto-sizes
	result = result.replace(/\\left\s*\(/g, '(');
	result = result.replace(/\\right\s*\)/g, ')');

	// Convert \left[ ... \right] to [ ... ]
	result = result.replace(/\\left\s*\[/g, '[');
	result = result.replace(/\\right\s*\]/g, ']');

	// Convert \left| ... \right| to abs( ... ) or |...|
	// Use lr(|...|) for proper sizing in Typst
	result = result.replace(/\\left\s*\|/g, 'lr(|');
	result = result.replace(/\\right\s*\|/g, '|)');

	// Convert \left\{ ... \right\} to { ... }
	result = result.replace(/\\left\s*\\{/g, '{');
	result = result.replace(/\\right\s*\\}/g, '}');

	// Convert \left\lbrace ... \right\rbrace to { ... }
	result = result.replace(/\\left\s*\\lbrace/g, '{');
	result = result.replace(/\\right\s*\\rbrace/g, '}');

	// Convert standalone \lbrace and \rbrace
	result = result.replace(/\\lbrace/g, '{');
	result = result.replace(/\\rbrace/g, '}');

	// Convert standalone LaTeX escaped braces \{ and \}
	// These produce literal braces in LaTeX, must be after \left\{ handling
	result = result.replace(/\\{/g, '{');
	result = result.replace(/\\}/g, '}');

	// Re-run {,} replacement in case \{,\} was converted to {,}
	result = result.replace(/\{,\}/g, '<<<DECIMAL_COMMA>>>');

	// Handle invisible delimiters \left. and \right.
	result = result.replace(/\\left\s*\./g, '');
	result = result.replace(/\\right\s*\./g, '');

	// Fallback: remove any remaining \left or \right (unhandled delimiter cases)
	result = result.replace(/\\left\s*/g, '');
	result = result.replace(/\\right\s*/g, '');

	// Convert \dfrac{a}{b} and \frac{a}{b} to frac(a, b)
	// Uses balanced brace matching to handle nested braces like \dfrac{(-1)^{n+1}}{u^2_n}
	result = convertLatexFractions(result);

	// Convert \begin{cases} ... \end{cases} to Typst cases()
	// LaTeX: \begin{cases} a & b \\ c & d \end{cases}
	// Typst: cases(display(a & b), display(c & d))
	// Use display() to ensure normal size (not cramped style)
	result = result.replace(/\\begin\s*\{cases\}([\s\S]*?)\\end\s*\{cases\}/g, (_, content) => {
		// Split by \\ and clean up
		const lines = content
			.split(/\\\\/)
			.map((line: string) => line.trim())
			.filter((line: string) => line.length > 0);
		// Wrap each line in display() for normal size
		return 'cases(' + lines.map((line: string) => `display(${line})`).join(', ') + ')';
	});

	// Convert \sqrt{x} to sqrt(x) - use balanced brace matching
	result = convertLatexOneArgCommand(result, 'sqrt', 'sqrt');

	// Convert \sqrt[n]{x} to root(n, x) - handle separately (two arguments)
	// This must be done AFTER the simple \sqrt conversion
	// Note: we use a simplified pattern here as nested braces in the optional arg are rare
	result = result.replace(/sqrt\s*\[([^\]]*)\]\s*\(([^()]*)\)/g, 'root($1, $2)');

	// Convert known functions: \sin, \cos, \tan, \log, \ln, \exp, etc.
	// Remove backslash - Typst recognizes these directly
	const knownFunctions = [
		'sin',
		'cos',
		'tan',
		'cot',
		'sec',
		'csc',
		'arcsin',
		'arccos',
		'arctan',
		'sinh',
		'cosh',
		'tanh',
		'log',
		'ln',
		'exp',
		'lim',
		'sup',
		'inf',
		'min',
		'max',
		'det',
		'dim',
		'ker',
		'deg',
		'gcd',
		'mod',
		'arg'
	];
	for (const func of knownFunctions) {
		const regex = new RegExp(`\\\\${func}(?![a-zA-Z])`, 'g');
		result = result.replace(regex, func);
	}

	// Convert Greek letters
	const greekLetters = [
		'alpha',
		'beta',
		'gamma',
		'delta',
		'epsilon',
		'zeta',
		'eta',
		'theta',
		'iota',
		'kappa',
		'lambda',
		'mu',
		'nu',
		'xi',
		'pi',
		'rho',
		'sigma',
		'tau',
		'upsilon',
		'phi',
		'chi',
		'psi',
		'omega',
		'Gamma',
		'Delta',
		'Theta',
		'Lambda',
		'Xi',
		'Pi',
		'Sigma',
		'Upsilon',
		'Phi',
		'Psi',
		'Omega',
		'varepsilon',
		'vartheta',
		'varpi',
		'varrho',
		'varsigma',
		'varphi'
	];
	for (const letter of greekLetters) {
		const regex = new RegExp(`\\\\${letter}(?![a-zA-Z])`, 'g');
		result = result.replace(regex, letter);
	}

	// Ellipsis (dots) - MUST be before \cdot conversion
	result = result.replace(/\\cdots/g, 'dots.c');
	result = result.replace(/\\vdots/g, 'dots.v');
	result = result.replace(/\\ddots/g, 'dots.down');
	result = result.replace(/\\ldots/g, '...');

	// Convert arithmetic operators (using helper to add space before digits)
	result = replaceLatexCmd(result, 'cdot', 'dot.c');
	result = replaceLatexCmd(result, 'times', 'times');
	result = replaceLatexCmd(result, 'div', 'div');
	result = replaceLatexCmd(result, 'pm', 'plus.minus');
	result = replaceLatexCmd(result, 'mp', 'minus.plus');
	result = replaceLatexCmd(result, 'infty', 'infinity');

	// Convert comparison operators - ORDER MATTERS: slant/negated versions before regular
	result = replaceLatexCmd(result, 'nleqslant', 'lt.eq.slant.not');
	result = replaceLatexCmd(result, 'ngeqslant', 'gt.eq.slant.not');
	result = replaceLatexCmd(result, 'leqslant', 'lt.eq.slant');
	result = replaceLatexCmd(result, 'geqslant', 'gt.eq.slant');
	result = result.replace(/\\leq/g, '<=');
	result = result.replace(/\\le(?![a-z])/g, '<=');
	result = result.replace(/\\geq/g, '>=');
	result = result.replace(/\\ge(?![a-z])/g, '>=');
	result = result.replace(/\\neq/g, '!=');
	result = result.replace(/\\ne(?![a-z])/g, '!=');
	// Comparison operators that end with letters (using helper)
	result = replaceLatexCmd(result, 'approx', 'approx');
	result = replaceLatexCmd(result, 'equiv', 'equiv');
	result = replaceLatexCmd(result, 'sim', 'tilde.eq');

	// Convert arrows
	result = result.replace(/\\to/g, '->');
	result = result.replace(/\\rightarrow/g, '->');
	result = result.replace(/\\leftarrow/g, '<-');
	result = result.replace(/\\leftrightarrow/g, '<->');
	result = result.replace(/\\Rightarrow/g, '=>');
	result = result.replace(/\\Leftarrow/g, '<=');
	result = result.replace(/\\Leftrightarrow/g, '<=>');

	// Integrals - MUST be before \in conversion (otherwise \int becomes "int")
	// Order matters: longer commands first
	result = replaceLatexCmd(result, 'iiint', 'integral.triple');
	result = replaceLatexCmd(result, 'iint', 'integral.double');
	result = replaceLatexCmd(result, 'oint', 'integral.cont');
	result = replaceLatexCmd(result, 'int', 'integral');

	// Convert set operators
	result = replaceLatexCmd(result, 'notin', 'in.not');
	result = replaceLatexCmd(result, 'in', 'in');
	result = replaceLatexCmd(result, 'subseteq', 'subset.eq');
	result = replaceLatexCmd(result, 'subset', 'subset');
	result = replaceLatexCmd(result, 'supseteq', 'supset.eq');
	result = replaceLatexCmd(result, 'supset', 'supset');
	result = replaceLatexCmd(result, 'cup', 'union');
	result = replaceLatexCmd(result, 'cap', 'sect');
	result = replaceLatexCmd(result, 'emptyset', 'emptyset');

	// Convert common symbols
	result = replaceLatexCmd(result, 'forall', 'forall');
	result = replaceLatexCmd(result, 'exists', 'exists');
	result = replaceLatexCmd(result, 'partial', 'diff');
	result = replaceLatexCmd(result, 'nabla', 'nabla');
	result = replaceLatexCmd(result, 'ell', 'ell'); // Script lowercase L (ℓ)
	result = replaceLatexCmd(result, 'prime', 'prime'); // Prime symbol (′)

	// Convert text command
	result = result.replace(/\\text\s*{([^{}]*)}/g, '"$1"');
	result = result.replace(/\\textbf\s*{([^{}]*)}/g, 'bold("$1")');
	result = result.replace(/\\textit\s*{([^{}]*)}/g, 'italic("$1")');

	// ========================================================================
	// NEW CONVERSIONS - Must be BEFORE the catch-all
	// ========================================================================

	// 1. Align environments - remove delimiters
	// Handle: align, align*, aligned, aligned*, gather, gather*, equation, equation*, split, multline
	result = result.replace(/\\begin\{align\*?\}/g, '');
	result = result.replace(/\\end\{align\*?\}/g, '');
	result = result.replace(/\\begin\{aligned\*?\}/g, '');
	result = result.replace(/\\end\{aligned\*?\}/g, '');
	result = result.replace(/\\begin\{gather\*?\}/g, '');
	result = result.replace(/\\end\{gather\*?\}/g, '');
	result = result.replace(/\\begin\{equation\*?\}/g, '');
	result = result.replace(/\\end\{equation\*?\}/g, '');
	result = result.replace(/\\begin\{split\}/g, '');
	result = result.replace(/\\end\{split\}/g, '');
	result = result.replace(/\\begin\{multline\*?\}/g, '');
	result = result.replace(/\\end\{multline\*?\}/g, '');
	result = result.replace(/\\begin\{flalign\*?\}/g, '');
	result = result.replace(/\\end\{flalign\*?\}/g, '');

	// Debug: log any remaining \begin{...} patterns that weren't converted
	const beginMatch = result.match(/\\begin\{([^}]+)\}/);
	if (beginMatch) {
		logger.warn('convertLatexToTypstMath: unhandled \\begin environment', {
			environment: beginMatch[1],
			context: result.slice(Math.max(0, beginMatch.index! - 20), beginMatch.index! + 50)
		});
	}

	// 2. Binomial coefficients (2 arguments)
	result = result.replace(/\\binom\s*{([^{}]*)}\s*{([^{}]*)}/g, 'binom($1, $2)');

	// 3. Vectors and accents (1 argument)
	result = result.replace(/\\vec\s*{([^{}]*)}/g, 'arrow($1)');
	result = result.replace(/\\hat\s*{([^{}]*)}/g, 'hat($1)');
	result = result.replace(/\\bar\s*{([^{}]*)}/g, 'macron($1)');
	result = result.replace(/\\tilde\s*{([^{}]*)}/g, 'tilde($1)');
	result = result.replace(/\\dot\s*{([^{}]*)}/g, 'dot($1)');
	result = result.replace(/\\ddot\s*{([^{}]*)}/g, 'diaer($1)');
	result = result.replace(/\\overline\s*{([^{}]*)}/g, 'overline($1)');
	result = result.replace(/\\underline\s*{([^{}]*)}/g, 'underline($1)');

	// 4. Number sets (blackboard bold) - specific letters
	result = result.replace(/\\mathbb\s*{R}/g, 'RR');
	result = result.replace(/\\mathbb\s*{N}/g, 'NN');
	result = result.replace(/\\mathbb\s*{Z}/g, 'ZZ');
	result = result.replace(/\\mathbb\s*{Q}/g, 'QQ');
	result = result.replace(/\\mathbb\s*{C}/g, 'CC');

	// 5. Math text styles (1 argument) - use balanced brace matching for nested content
	result = convertLatexOneArgCommand(result, 'mathbf', 'bold');
	result = convertLatexOneArgCommand(result, 'mathit', 'italic');
	result = convertLatexOneArgCommand(result, 'mathrm', 'upright');
	result = convertLatexOneArgCommand(result, 'mathcal', 'cal');
	result = convertLatexOneArgCommand(result, 'mathfrak', 'frak');

	// Debug: check if mathcal still remains after conversion
	if (result.includes('mathcal')) {
		logger.warn('convertLatexToTypstMath: mathcal still present after conversion', {
			preview: result.slice(0, 200)
		});
	}

	// 6. Sums and products
	result = replaceLatexCmd(result, 'sum', 'sum');
	result = replaceLatexCmd(result, 'prod', 'product');

	// Limits commands - Typst handles this automatically, just remove them
	result = result.replace(/\\limits/g, '');
	result = result.replace(/\\nolimits/g, '');

	// Display style commands - remove (Typst handles display mode differently)
	// IMPORTANT: Must be before other conversions to prevent \d being interpreted as escape
	result = result.replace(/\\displaystyle/g, '');
	result = result.replace(/\\textstyle/g, '');
	result = result.replace(/\\scriptstyle/g, '');
	result = result.replace(/\\scriptscriptstyle/g, '');

	// Limit operator
	result = replaceLatexCmd(result, 'lim', 'lim');

	// Arrow operators
	result = result.replace(/\\to(?![a-z])/g, '->');
	result = result.replace(/\\rightarrow/g, '->');
	result = result.replace(/\\leftarrow/g, '<-');
	result = result.replace(/\\Rightarrow/g, '=>');
	result = result.replace(/\\Leftarrow/g, '<=');
	result = result.replace(/\\Leftrightarrow/g, '<=>');
	result = result.replace(/\\longrightarrow/g, '-->');
	result = result.replace(/\\longleftarrow/g, '<--');
	result = result.replace(/\\mapsto/g, '|->');
	result = result.replace(/\\iff/g, '<=>');

	// 7. Math spaces - ORDER MATTERS: qquad before quad
	// Add spaces around to prevent merging with adjacent letters (e.g., "a\:n" -> "a med n", not "amedn")
	result = result.replace(/\\qquad/g, ' wide ');
	result = result.replace(/\\quad/g, ' quad ');
	result = result.replace(/\\,/g, ' thin ');
	result = result.replace(/\\:/g, ' med ');
	result = result.replace(/\\;/g, ' thick ');
	result = result.replace(/\\!/g, ' negthin ');

	// 10. Double backslash for line breaks (align environment)
	result = result.replace(/\\\\/g, '\\');

	// ========================================================================
	// END NEW CONVERSIONS
	// ========================================================================

	// Convert subscript and superscript braces to parentheses
	// LaTeX: x^{2n} or x_{ij}  ->  Typst: x^(2n) or x_(ij)
	// Single characters don't need grouping, but parentheses work for all cases
	result = result.replace(/\^{([^{}]*)}/g, '^($1)');
	result = result.replace(/_{([^{}]*)}/g, '_($1)');

	// Add space after single-letter subscripts when followed by open parenthesis
	// Prevents Typst from parsing u_n(...) as u with subscript n(...)
	// LaTeX: u_n(1-x) means u subscript n, then parenthetical expression
	// Typst: u_n (1-x) - space needed to separate subscript from parenthesis
	result = result.replace(/_([a-zA-Z0-9])\(/g, '_$1 (');

	// Add space after multi-character subscripts when followed by open parenthesis
	// Handles cases like u_{n+1}(x) -> u_(n+1) (x)
	// The subscript has already been converted from _{...} to _(...) above
	// Pattern: _(...) immediately followed by ( needs a space
	result = result.replace(/_\(([^()]*)\)\(/g, '_($1) (');

	// ========================================================================
	// UNKNOWN LATEX COMMANDS HANDLING
	// ========================================================================
	// Convert remaining backslash commands to Typst text to prevent compilation errors.
	// Pattern: \commandname (backslash followed by letters)
	// These are converted to quoted strings so they display visibly for debugging.
	const knownTypstKeywords = new Set([
		// Typst spacing commands (already converted, but might appear in edge cases)
		'thin',
		'med',
		'thick',
		'quad',
		'wide',
		'negthin',
		// Escape sequences that should remain
		'n',
		't',
		'r'
	]);

	result = result.replace(/\\([a-zA-Z]+)/g, (match, cmdName: string) => {
		// Skip known Typst keywords
		if (knownTypstKeywords.has(cmdName)) {
			return match;
		}
		// Convert unknown LaTeX command to visible text
		// This prevents Typst compilation errors while making the issue visible
		logger.warn('convertLatexToTypstMath: unknown LaTeX command converted to text', {
			command: match,
			context: result.slice(0, 50)
		});
		return `"${cmdName}"`;
	});

	// ========================================================================
	// FRENCH DECIMAL COMMA HANDLING (Step 2 of 2)
	// ========================================================================
	// Convert the placeholder to Typst string comma: ","
	// Why "," (string) and not bare comma:
	// - In Typst math mode, bare comma is an argument separator with spacing
	// - String "," displays as literal comma without extra spacing
	// - This is the recommended approach per Typst GitHub issue #5272
	// Must be done AFTER \, -> thin conversion to avoid conflict.
	result = result.replace(/<<<DECIMAL_COMMA>>>/g, '","');

	return result;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Escape special Typst characters
 *
 * Characters to escape: # $ @ * _ ` [ ] < > \
 *
 * @param text - Text to escape
 * @returns Escaped text safe for Typst
 */
export function escapeTypst(text: string): string {
	// Characters that need escaping in Typst content mode
	const replacements: Record<string, string> = {
		'\\': '\\\\',
		'#': '\\#',
		$: '\\$',
		'@': '\\@',
		'*': '\\*',
		_: '\\_',
		'`': '\\`',
		'<': '\\<',
		'>': '\\>'
	};

	return text.replace(/[\\#$@*_`<>]/g, (match) => replacements[match] || match);
}

/**
 * Escape special characters for Typst bracket content
 *
 * Inside [...], we need to escape [ and ] additionally
 *
 * @param text - Text to escape
 * @returns Escaped text safe for Typst brackets
 */
export function escapeTypstBrackets(text: string): string {
	// First apply standard escaping
	let escaped = escapeTypst(text);

	// Then escape brackets
	escaped = escaped.replace(/\[/g, '\\[').replace(/\]/g, '\\]');

	return escaped;
}

/**
 * Resolve image path for Typst
 *
 * Converts relative paths to absolute or keeps URL as-is.
 *
 * @param src - Image source (relative path or URL)
 * @param basePath - Base path for relative images
 * @returns Resolved image path for Typst
 */
export function resolveImagePath(src: string, basePath: string): string {
	// If it's a URL, keep as-is (Typst can handle URLs)
	if (src.startsWith('http://') || src.startsWith('https://')) {
		return src;
	}

	// Relative path
	if (basePath && !src.startsWith('/')) {
		return `${basePath}/${src}`;
	}

	return src;
}

/**
 * Generate minimal Typst document from markdown
 *
 * Convenience function that parses and generates in one step.
 * Useful for quick testing.
 *
 * @param markdown - Markdown text
 * @param options - Generator options
 * @returns Complete Typst document
 */
export async function markdownToTypst(
	markdown: string,
	options: TypstTranspilerOptions = {}
): Promise<string> {
	// Dynamic import to avoid circular dependency issues
	const { parseMarkdown } = await import('$lib/ubumark/parser/markdown-parser');
	const ast = parseMarkdown(markdown);
	return generateTypst(ast, options);
}
