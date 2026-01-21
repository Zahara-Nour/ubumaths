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
import { urlToVirtualPath, isExternalUrl as checkExternalUrl } from '$lib/typst/image-loader';

const logger = createLogger('typst-generator');

// ============================================================================
// EXTERNAL IMAGE TRACKING
// ============================================================================

/**
 * Module-level set to track external image URLs during Typst generation.
 *
 * Call `clearTrackedExternalImages()` before generating content,
 * then `getTrackedExternalImages()` after to get the list of URLs
 * that need to be fetched and mapped to the virtual file system.
 */
const trackedExternalImages = new Set<string>();

/**
 * Clear the tracked external images set
 *
 * Call this before starting a new Typst generation to reset the tracking.
 */
export function clearTrackedExternalImages(): void {
	trackedExternalImages.clear();
}

/**
 * Get all tracked external image URLs
 *
 * Call this after generating Typst content to get the list of external
 * images that need to be fetched and mapped to the virtual file system.
 *
 * @returns Array of external image URLs
 */
export function getTrackedExternalImages(): string[] {
	return Array.from(trackedExternalImages);
}

/**
 * Track an external image URL
 *
 * @param url - External URL to track
 */
function trackExternalImage(url: string): void {
	trackedExternalImages.add(url);
}

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
			// Use #emph[] instead of _..._ for italic - more reliable in content blocks
			if (node.italic) text = `#emph[${text}]`;
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

			// ============================================================================
			// IMPORTANT: Why we DON'T use #box[] for inline math
			// ============================================================================
			//
			// Problem: We wanted to use #box[$...$] to prevent line breaks within
			// inline math expressions. However, this causes baseline misalignment.
			//
			// Root cause: Known Typst bug #4796 - "Boxing an inline equation shifts
			// the baseline". When wrapping inline math in box(), Typst shifts the
			// baseline to the vertical center instead of preserving the equation's
			// natural baseline.
			//
			// See:
			// - https://github.com/typst/typst/issues/4796
			// - https://forum.typst.app/t/how-to-force-inline-equation-not-to-break-without-baseline-shift/5406
			// - https://github.com/typst/typst/discussions/4751
			//
			// Attempted solutions that DON'T work:
			// - #box[$...$]              → baseline shifts to center (bug)
			// - #box(baseline: 40%)[$...$] → manual value, not universal
			// - #box(baseline: 50%)[$...$] → still misaligned
			//
			// Current solution: No box wrapper. Typst handles baseline alignment
			// naturally like LaTeX does with $...$. The tradeoff is that very long
			// inline equations might break across lines, but this is rare and
			// acceptable (same behavior as LaTeX).
			//
			// Future: When Typst fixes bug #4796, we can reconsider using box().
			// ============================================================================
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
	if (node.transpose) {
		// Transposed table: transpose data, first column is bold (headers)
		// Number of output columns = 1 (header) + number of data rows
		const numCols = 1 + node.rows.length;
		// First column left-aligned, rest centered
		const alignments = ['left', ...Array(node.rows.length).fill('center')];

		// Transpose: each source column becomes an output row
		const rows: string[] = [];
		for (let col = 0; col < node.header.length; col++) {
			const cells: string[] = [
				// First cell: header in bold (may contain math like $z_i$)
				`[*${processTableCellContent(node.header[col].content)}*]`
			];
			// Data cells from each row (may contain math)
			for (const row of node.rows) {
				cells.push(`[${processTableCellContent(row[col]?.content || '')}]`);
			}
			rows.push(cells.join(', '));
		}

		return `#table(
  columns: ${numCols},
  align: (${alignments.join(', ')}),
  ${rows.join(',\n  ')}
)`;
	}

	// Standard vertical table
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

	// Build header cells (may contain math like $z_i$)
	const headerCells = node.header
		.map((cell: { content: string }) => `[*${processTableCellContent(cell.content)}*]`)
		.join(', ');

	// Build body rows (may contain math)
	const bodyRows = node.rows
		.map((row: { content: string }[]) =>
			row
				.map((cell: { content: string }) => `[${processTableCellContent(cell.content)}]`)
				.join(', ')
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
	const isInline = node.sizeClass === 'inline';

	// Handle external URLs: use virtual paths for Typst WASM compatibility
	// The caller must fetch these images and map them to the virtual file system
	if (checkExternalUrl(node.src)) {
		// Track this URL so caller knows which images to fetch
		trackExternalImage(node.src);

		// Convert to virtual path
		const virtualPath = urlToVirtualPath(node.src);

		// Get dimensions from the service
		const dimensions = getDimensionsForFormat(node, 'typst');

		// Build the image command with virtual path
		const imageCommand = buildImageCommand(node, virtualPath, dimensions, isInline);

		// Inline images: wrap in box for text alignment
		if (isInline) {
			return `#box(height: 1em)[#image("${virtualPath}")]`;
		}

		// Images with caption: use figure function
		if (node.caption) {
			return buildFigure(node, virtualPath, dimensions);
		}

		// Block images without caption: use alignment wrapper
		return buildAlignedImage(node, imageCommand);
	}

	// Local images: use resolved path
	const imagePath = resolveImagePath(node.src, options.imageBasePath);

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
 * Convert LaTeX \textcolor{color}{content} to Typst text(fill: color, content)
 *
 * In Typst math mode, colored text/math can be done with:
 * text(fill: red, content) where content can be math or text
 *
 * @param str - Input string containing \textcolor commands
 * @returns String with \textcolor commands converted
 */
function convertTextcolorCommand(str: string): string {
	let result = str;
	const pattern = /\\textcolor\s*\{/g;
	let match;

	let changed = true;
	while (changed) {
		changed = false;
		pattern.lastIndex = 0;

		while ((match = pattern.exec(result)) !== null) {
			const startIndex = match.index;
			const colorOpenBrace = match.index + match[0].length - 1;

			// Find closing brace for color argument
			const colorCloseIndex = findMatchingBrace(result, colorOpenBrace);
			if (colorCloseIndex === -1) continue;

			const color = result.slice(colorOpenBrace + 1, colorCloseIndex).trim();

			// Look for the second argument (content) immediately after
			const afterColor = result.slice(colorCloseIndex + 1);
			const contentMatch = afterColor.match(/^\s*\{/);
			if (!contentMatch) continue;

			const contentOpenBrace =
				colorCloseIndex + 1 + contentMatch.index! + contentMatch[0].length - 1;
			const contentCloseIndex = findMatchingBrace(result, contentOpenBrace);
			if (contentCloseIndex === -1) continue;

			const content = result.slice(contentOpenBrace + 1, contentCloseIndex);

			// Convert to Typst: text(fill: color, content)
			// Note: In Typst math, we need to use the hash prefix to call content-mode functions
			// But text() in math mode works directly with fill parameter
			const replacement = `#text(fill: ${color})[${content}]`;
			result = result.slice(0, startIndex) + replacement + result.slice(contentCloseIndex + 1);

			changed = true;
			pattern.lastIndex = 0;
			break;
		}
	}

	return result;
}

/**
 * Convert LaTeX \text{...} commands to Typst, handling nested math expressions.
 *
 * In LaTeX, \text{car $x-1<0$} contains text "car " and math "$x-1<0$".
 * In Typst math mode, this becomes: "car " x - 1 < 0
 *
 * @param str - Input string containing \text{...} commands
 * @returns String with \text commands converted
 */
function convertTextCommand(str: string): string {
	let result = str;
	const pattern = /\\text\s*\{/g;
	let match;

	let changed = true;
	while (changed) {
		changed = false;
		pattern.lastIndex = 0;

		while ((match = pattern.exec(result)) !== null) {
			const startIndex = match.index;
			const openBraceIndex = match.index + match[0].length - 1;

			// Find matching closing brace
			const closeIndex = findMatchingBrace(result, openBraceIndex);
			if (closeIndex === -1) continue;

			const content = result.slice(openBraceIndex + 1, closeIndex);

			// Parse content for $...$ math segments
			const parts: string[] = [];
			let lastIndex = 0;
			const mathRegex = /\$([^$]+)\$/g;
			let mathMatch;

			while ((mathMatch = mathRegex.exec(content)) !== null) {
				// Add text before this math segment (quoted)
				if (mathMatch.index > lastIndex) {
					const textPart = content.slice(lastIndex, mathMatch.index);
					if (textPart) {
						parts.push(`"${textPart}"`);
					}
				}

				// Add the math segment (will be converted by the outer function)
				// Just remove the $ delimiters - the math is already in math mode
				parts.push(mathMatch[1]);

				lastIndex = mathMatch.index + mathMatch[0].length;
			}

			// Add remaining text after last math segment (quoted)
			if (lastIndex < content.length) {
				const textPart = content.slice(lastIndex);
				if (textPart) {
					parts.push(`"${textPart}"`);
				}
			}

			// If no math was found, just quote the whole content
			const replacement = parts.length > 0 ? parts.join(' ') : `"${content}"`;
			result = result.slice(0, startIndex) + replacement + result.slice(closeIndex + 1);

			changed = true;
			pattern.lastIndex = 0;
			break;
		}
	}

	return result;
}

/**
 * Convert LaTeX \sqrt[n]{x} (n-th root) to Typst root(n, x)
 * Uses balanced brace matching to handle nested braces in the argument
 *
 * @param str - Input string
 * @returns String with n-th roots converted
 *
 * @example
 * convertLatexNthRoot('\\sqrt[3]{e^4}') // Returns 'root(3, e^4)'
 * convertLatexNthRoot('\\sqrt[3]{e}') // Returns 'root(3, e)'
 */
function convertLatexNthRoot(str: string): string {
	let result = str;
	// Pattern: \sqrt followed by optional whitespace, [n], optional whitespace, {
	const pattern = /\\sqrt\s*\[([^\]]*)\]\s*\{/g;
	let match;

	let changed = true;
	while (changed) {
		changed = false;
		pattern.lastIndex = 0;

		while ((match = pattern.exec(result)) !== null) {
			const startIndex = match.index;
			const nthRoot = match[1]; // The 'n' in \sqrt[n]
			const openBraceIndex = result.indexOf('{', match.index + match[0].length - 1);

			if (openBraceIndex === -1) continue;

			// Find matching closing brace
			const closeIndex = findMatchingBrace(result, openBraceIndex);
			if (closeIndex === -1) continue;

			const content = result.slice(openBraceIndex + 1, closeIndex);

			// Replace \sqrt[n]{...} with root(n, ...)
			const replacement = `root(${nthRoot}, ${content})`;
			result = result.slice(0, startIndex) + replacement + result.slice(closeIndex + 1);

			changed = true;
			pattern.lastIndex = 0;
			break;
		}
	}

	return result;
}

/**
 * Convert LaTeX subscript/superscript braces to Typst parentheses
 * Handles nested braces properly (e.g., P_{\overline{R_{n}}} -> P_(overline(R_(n))))
 *
 * @param str - Input string
 * @param operator - The operator to convert ('^' for superscript, '_' for subscript)
 * @returns String with subscripts/superscripts converted
 */
function convertSubscriptSuperscript(str: string, operator: '^' | '_'): string {
	let result = str;
	// Escape the operator for regex (^ needs escaping)
	const escapedOp = operator === '^' ? '\\^' : '_';
	const pattern = new RegExp(`${escapedOp}\\{`, 'g');
	let match;

	// Keep converting until no more matches (handles nested cases)
	let changed = true;
	while (changed) {
		changed = false;
		pattern.lastIndex = 0;

		while ((match = pattern.exec(result)) !== null) {
			const startIndex = match.index;
			const openBraceIndex = match.index + match[0].length - 1;

			// Find matching closing brace
			const closeIndex = findMatchingBrace(result, openBraceIndex);
			if (closeIndex === -1) continue;

			const content = result.slice(openBraceIndex + 1, closeIndex);

			// Replace operator{...} with operator(...)
			const replacement = `${operator}(${content})`;
			result = result.slice(0, startIndex) + replacement + result.slice(closeIndex + 1);

			changed = true;
			pattern.lastIndex = 0;
			break;
		}
	}

	return result;
}

/**
 * Find the matching closing parenthesis for an opening parenthesis at the given position.
 * Handles nested parentheses properly.
 *
 * @param str - The string to search in
 * @param openPos - Position of the opening parenthesis
 * @returns Position of the matching closing parenthesis, or -1 if not found
 */
function findMatchingParen(str: string, openPos: number): number {
	if (str[openPos] !== '(') return -1;
	let depth = 1;
	let i = openPos + 1;
	while (i < str.length && depth > 0) {
		if (str[i] === '(') depth++;
		else if (str[i] === ')') depth--;
		i++;
	}
	return depth === 0 ? i - 1 : -1;
}

/**
 * Add space after subscript parentheses when immediately followed by open parenthesis
 * Handles nested parentheses properly (e.g., P_(overline(R_(n)))(x) -> P_(overline(R_(n))) (x))
 *
 * @param str - Input string
 * @returns String with spaces added
 */
function addSpaceAfterSubscriptParens(str: string): string {
	let result = str;
	let i = 0;

	while (i < result.length - 1) {
		// Look for _( pattern
		if (result[i] === '_' && result[i + 1] === '(') {
			const openPos = i + 1;
			const closePos = findMatchingParen(result, openPos);

			if (closePos !== -1 && closePos + 1 < result.length && result[closePos + 1] === '(') {
				// Insert space after the closing paren
				result = result.slice(0, closePos + 1) + ' ' + result.slice(closePos + 1);
				// Move past this subscript
				i = closePos + 2;
			} else {
				i++;
			}
		} else {
			i++;
		}
	}

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
			// Add space before frac() if preceded by a letter to prevent fusion
			// Example: \times\dfrac{...} should become "\times frac(...)" not "\timesfrac(...)"
			// This allows the later \times conversion to match properly.
			const needsSpace = startIndex > 0 && /[a-zA-Z]/.test(result[startIndex - 1]);
			const replacement = (needsSpace ? ' ' : '') + 'frac(' + numerator + ', ' + denominator + ')';
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
 * Known Typst symbols that should NOT be split by implicit multiplication.
 * Includes built-in functions, Greek letters, and math symbols.
 */
const KNOWN_TYPST_SYMBOLS = new Set([
	// Functions
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
	'max',
	'min',
	'sup',
	'inf',
	'det',
	'dim',
	'ker',
	'deg',
	'gcd',
	'mod',
	'arg',
	'sum',
	'product',
	'sqrt',
	'root',
	'frac',
	'binom',
	'integral',
	'display',
	'cases',
	'lr',
	'grid',
	'cell',
	'text',
	'bold',
	'italic',
	'upright',
	'cal',
	'frak',
	'overline',
	'underline',
	'hat',
	'macron',
	'tilde',
	'arrow',
	'dot',
	'diaer',
	'limsup',
	'liminf',
	// Greek letters (lowercase - uppercase are short enough)
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
	'varepsilon',
	'vartheta',
	'varpi',
	'varrho',
	'varsigma',
	'varphi',
	// Typst math symbols
	'infinity',
	'forall',
	'exists',
	'partial',
	'diff',
	'nabla',
	'emptyset',
	'union',
	'sect',
	'subset',
	'supset',
	'approx',
	'equiv',
	'prime',
	'ell',
	'plus',
	'minus',
	'times',
	'div',
	'dots',
	// Dot variants
	'thin',
	'med',
	'thick',
	'quad',
	'wide',
	'negthin',
	// Symbol modifiers (used in constructs like lt.eq.slant)
	'in',
	'eq',
	'lt',
	'gt',
	'not',
	'slant',
	'double',
	'cont',
	'triple',
	// Differential notation (dx, dy, dz, dt, etc.) - these are NOT implicit multiplication
	'dx',
	'dy',
	'dz',
	'dt',
	'ds',
	'du',
	'dv',
	'dw',
	'dr',
	'da',
	'db',
	'dc',
	'dn',
	'dm',
	'dk',
	'dp',
	'dq'
]);

/**
 * Add spaces between adjacent single letters for implicit multiplication in Typst
 *
 * In LaTeX: `nr` means n × r (implicit multiplication)
 * In Typst: `nr` is an unknown variable; `n r` means n × r
 *
 * This function splits sequences of 2+ lowercase letters that aren't known
 * Typst symbols into individual letters with spaces.
 *
 * IMPORTANT: This function protects content that should NOT be modified:
 * - Quoted strings: "text" should stay as "text", not "t e x t"
 * - Typst code: #text(fill: red) should stay intact
 *
 * @param str - Math expression string
 * @returns String with spaces added for implicit multiplication
 *
 * @example
 * addImplicitMultiplicationSpaces('e^(-nr)') // Returns 'e^(-n r)'
 * addImplicitMultiplicationSpaces('sin(x)') // Returns 'sin(x)' (known function)
 * addImplicitMultiplicationSpaces('xyz') // Returns 'x y z'
 * addImplicitMultiplicationSpaces('"text"') // Returns '"text"' (protected)
 */
function addImplicitMultiplicationSpaces(str: string): string {
	// Protect content that should not be modified
	const protections: string[] = [];
	let protected_ = str;

	// Protect quoted strings "..."
	protected_ = protected_.replace(/"[^"]*"/g, (match) => {
		protections.push(match);
		return `<<<PROTECT_${protections.length - 1}>>>`;
	});

	// Protect Typst function calls #func(...)[...] or #func[...]
	// Pattern matches: #identifier followed by optional (...) and optional [...]
	protected_ = protected_.replace(/#[a-zA-Z_]+(?:\([^)]*\))?(?:\[[^\]]*\])?/g, (match) => {
		protections.push(match);
		return `<<<PROTECT_${protections.length - 1}>>>`;
	});

	// Apply implicit multiplication to remaining content
	protected_ = protected_.replace(/([a-z]{2,})/g, (match, _group, offset, fullStr) => {
		// If followed by '(', it's a function call - preserve entire match
		const nextChar = fullStr[offset + match.length];
		if (nextChar === '(') {
			return match;
		}

		// Check if this is a known symbol
		if (KNOWN_TYPST_SYMBOLS.has(match)) {
			return match;
		}

		// Check if preceded by . which indicates a method/property (e.g., dots.c)
		if (offset > 0 && fullStr[offset - 1] === '.') {
			return match;
		}

		// Split into individual letters with spaces
		return match.split('').join(' ');
	});

	// Restore protected content
	protected_ = protected_.replace(/<<<PROTECT_(\d+)>>>/g, (_, idx) => protections[parseInt(idx)]);

	return protected_;
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

		// Add space BEFORE if preceded by letter or digit (prevents "xtimes" and "2sect")
		if (offset > 0 && /[a-zA-Z0-9)]/.test(str[offset - 1])) {
			result = ' ' + result;
		}

		// Add space AFTER if followed by:
		// - digit: prevents "times0" being parsed as variable
		// - open paren: prevents "times(...)" being parsed as function call
		// - backslash: prevents "sect\overline" becoming "sectoverline" after conversion
		const afterPos = offset + match.length;
		if (afterPos < str.length && /[\d(\\]/.test(str[afterPos])) {
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

	// ========================================================================
	// ARROW PLACEHOLDERS (Step 1 of 2)
	// ========================================================================
	// MUST be done BEFORE \left/\right handling because \leftarrow and
	// \leftrightarrow would otherwise match the \left\s* fallback pattern.
	// Final restoration happens at the end of this function (Step 2).
	result = result.replace(/\\leftrightarrow/g, '<<<ARROW_LEFTRIGHT>>>');
	result = result.replace(/\\leftarrow/g, '<<<ARROW_LEFT>>>');
	result = result.replace(/\\rightarrow/g, '<<<ARROW_RIGHT>>>');
	result = result.replace(/\\to(?![a-z])/g, '<<<ARROW_RIGHT>>>');

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

	// Remove \big, \Big, \bigg, \Bigg sizing commands (Typst auto-sizes delimiters)
	// These commands just affect delimiter size in LaTeX, not needed in Typst
	// Must be done BEFORE removing unknown commands to avoid "\big" becoming "big" text
	result = result.replace(/\\[Bb]igg?\s*/g, '');

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

	// Convert \sqrt[n]{x} to root(n, x) - MUST be done BEFORE simple \sqrt conversion
	// Uses balanced brace matching to handle nested braces in the argument
	result = convertLatexNthRoot(result);

	// Convert \sqrt{x} to sqrt(x) - use balanced brace matching
	result = convertLatexOneArgCommand(result, 'sqrt', 'sqrt');

	// Add space before sqrt and root when preceded by letter/digit to prevent
	// variable fusion like "esqrt" being parsed as unknown variable
	result = result.replace(/([a-zA-Z0-9)])sqrt\(/g, '$1 sqrt(');
	result = result.replace(/([a-zA-Z0-9)])root\(/g, '$1 root(');

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

	// Double arrows - use placeholders (single arrows handled earlier)
	// Long versions must come BEFORE short versions (longer pattern first)
	result = result.replace(/\\Longleftrightarrow/g, '<<<ARROW_DOUBLE_LEFTRIGHT>>>');
	result = result.replace(/\\Longrightarrow/g, '<<<ARROW_DOUBLE_RIGHT>>>');
	result = result.replace(/\\Longleftarrow/g, '<<<ARROW_DOUBLE_LEFT>>>');
	result = result.replace(/\\Rightarrow/g, '<<<ARROW_DOUBLE_RIGHT>>>');
	result = result.replace(/\\Leftarrow/g, '<<<ARROW_DOUBLE_LEFT>>>');
	result = result.replace(/\\Leftrightarrow/g, '<<<ARROW_DOUBLE_LEFTRIGHT>>>');

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
	result = replaceLatexCmd(result, 'doubleprime', 'prime.double'); // Double prime (″)

	// Convert text command (handles nested math like \text{car $x-1<0$})
	result = convertTextCommand(result);
	result = result.replace(/\\textbf\s*{([^{}]*)}/g, 'bold("$1")');
	result = result.replace(/\\textit\s*{([^{}]*)}/g, 'italic("$1")');
	// Convert \textcolor{color}{content} -> #text(fill: color)[content]
	result = convertTextcolorCommand(result);

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

	// 3. Vectors and accents (1 argument) - use balanced brace matching for nested content
	result = convertLatexOneArgCommand(result, 'vec', 'arrow');
	result = convertLatexOneArgCommand(result, 'hat', 'hat');
	result = convertLatexOneArgCommand(result, 'bar', 'macron');
	result = convertLatexOneArgCommand(result, 'tilde', 'tilde');
	result = convertLatexOneArgCommand(result, 'dot', 'dot');
	result = convertLatexOneArgCommand(result, 'ddot', 'diaer');
	result = convertLatexOneArgCommand(result, 'overline', 'overline');
	result = convertLatexOneArgCommand(result, 'underline', 'underline');

	// 4. Number sets (blackboard bold) - specific letters
	result = result.replace(/\\mathbb\s*{R}/g, 'RR');
	result = result.replace(/\\mathbb\s*{N}/g, 'NN');
	result = result.replace(/\\mathbb\s*{Z}/g, 'ZZ');
	result = result.replace(/\\mathbb\s*{Q}/g, 'QQ');
	result = result.replace(/\\mathbb\s*{C}/g, 'CC');
	// French shortcuts for number sets (common in French math documents)
	// Must use word boundary (?![a-zA-Z]) to avoid matching \Natural, etc.
	result = result.replace(/\\R(?![a-zA-Z])/g, 'RR');
	result = result.replace(/\\N(?![a-zA-Z])/g, 'NN');
	result = result.replace(/\\Z(?![a-zA-Z])/g, 'ZZ');
	result = result.replace(/\\Q(?![a-zA-Z])/g, 'QQ');
	result = result.replace(/\\C(?![a-zA-Z])/g, 'CC');

	// MathLive special constants
	// \exponentialE -> Euler's number e (used by MathLive for proper semantic markup)
	// \imaginaryI -> imaginary unit i
	// IMPORTANT: Add space before e/i when preceded by a LETTER to prevent
	// variable fusion like "xe" being parsed as unknown variable (should be "x e")
	// Digits before e/i are fine (Typst handles "2e" as implicit multiplication)
	result = result.replace(/([a-zA-Z])\\exponentialE/g, '$1 e');
	result = result.replace(/\\exponentialE/g, 'e');
	result = result.replace(/([a-zA-Z])\\imaginaryI/g, '$1 i');
	result = result.replace(/\\imaginaryI/g, 'i');

	// Handle implicit multiplication with Euler's number e when NOT using \exponentialE
	// Pattern: letter followed by 'e' followed by '^' (exponent) should be "x e^..." not "xe^..."
	// This is common in expressions like "xe^{-x}" meaning "x times e^(-x)"
	// Must be done BEFORE subscript/superscript conversion to catch the ^ pattern
	result = result.replace(/([a-zA-Z])e\^/g, '$1 e^');

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

	// Arrow operators - handled via placeholders earlier to prevent "<-" confusion
	// Additional arrows not handled in the main placeholder section:
	result = result.replace(/\\longrightarrow/g, '<<<ARROW_LONG_RIGHT>>>');
	result = result.replace(/\\longleftarrow/g, '<<<ARROW_LONG_LEFT>>>');
	result = result.replace(/\\mapsto/g, '<<<ARROW_MAPSTO>>>');
	result = result.replace(/\\iff/g, '<<<ARROW_DOUBLE_LEFTRIGHT>>>');
	result = result.replace(/\\implies/g, '<<<ARROW_DOUBLE_RIGHT>>>');
	result = result.replace(/\\impliedby/g, '<<<ARROW_IMPLIED_BY>>>');

	// 7. Math spaces - ORDER MATTERS: qquad before quad
	// Add spaces around to prevent merging with adjacent letters (e.g., "a\:n" -> "a med n", not "amedn")
	result = result.replace(/\\qquad/g, ' wide ');
	result = result.replace(/\\quad/g, ' quad ');
	result = result.replace(/\\,/g, ' thin ');
	result = result.replace(/\\:/g, ' med ');
	result = result.replace(/\\;/g, ' thick ');
	result = result.replace(/\\!/g, ' negthin ');

	// 8. LaTeX tilde (~) is a non-breaking space in math mode
	// In Typst math, ~ would be interpreted as tilde symbol, so convert to space
	result = result.replace(/~/g, ' ');

	// 10. Double backslash for line breaks (align environment)
	result = result.replace(/\\\\/g, '\\');

	// ========================================================================
	// END NEW CONVERSIONS
	// ========================================================================

	// Convert subscript and superscript braces to parentheses
	// LaTeX: x^{2n} or x_{ij}  ->  Typst: x^(2n) or x_(ij)
	// Use balanced brace matching to handle nested braces like P_{\overline{R_{n}}}
	result = convertSubscriptSuperscript(result, '^');
	result = convertSubscriptSuperscript(result, '_');

	// Add space after single-letter subscripts when followed by open parenthesis
	// Prevents Typst from parsing u_n(...) as u with subscript n(...)
	// LaTeX: u_n(1-x) means u subscript n, then parenthetical expression
	// Typst: u_n (1-x) - space needed to separate subscript from parenthesis
	result = result.replace(/_([a-zA-Z0-9])\(/g, '_$1 (');

	// Add space after multi-character subscripts when followed by open parenthesis
	// Handles cases like P_(overline(R_(n)))(x) -> P_(overline(R_(n))) (x)
	// Must use balanced parenthesis matching to handle nested parens like overline(R_(n))
	result = addSpaceAfterSubscriptParens(result);

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

	// ========================================================================
	// CLEANUP: Fix malformed double subscripts
	// ========================================================================
	// If LaTeX source has x_{{n}} (double braces), it becomes x_(_(n)) after conversion
	// which is invalid Typst. Fix by removing the inner subscript operator.
	// Pattern: _( immediately followed by _( -> replace with just _(
	result = result.replace(/_\(_\(/g, '_(');

	// ========================================================================
	// ARROW HANDLING: Prevent "< -x" from becoming left arrow
	// ========================================================================
	// In Typst, `<-` is interpreted as a left arrow symbol.
	// But "< -x" (less than negative x) should NOT be an arrow.
	// We use placeholders for intentional arrows, then:
	// 1. Add space between < and - to prevent unintended arrows
	// 2. Restore intentional arrow placeholders
	result = result.replace(/<-/g, '< -'); // Fix "less than negative"
	result = result.replace(/<<<ARROW_RIGHT>>>/g, '->');
	result = result.replace(/<<<ARROW_LEFT>>>/g, '<-');
	result = result.replace(/<<<ARROW_LEFTRIGHT>>>/g, '<->');
	result = result.replace(/<<<ARROW_DOUBLE_RIGHT>>>/g, '=>');
	result = result.replace(/<<<ARROW_DOUBLE_LEFT>>>/g, '<=');
	result = result.replace(/<<<ARROW_DOUBLE_LEFTRIGHT>>>/g, '<=>');
	result = result.replace(/<<<ARROW_LONG_RIGHT>>>/g, '-->');
	result = result.replace(/<<<ARROW_LONG_LEFT>>>/g, '<--');
	result = result.replace(/<<<ARROW_MAPSTO>>>/g, '|->');
	result = result.replace(/<<<ARROW_IMPLIED_BY>>>/g, 'arrow.l.double');

	// ========================================================================
	// IMPLICIT MULTIPLICATION: Add spaces between adjacent letters
	// ========================================================================
	// In LaTeX: `nr` means n × r (implicit multiplication between variables)
	// In Typst: `nr` is an unknown variable; `n r` means n × r
	//
	// We need to split sequences of 2+ lowercase letters that aren't known
	// Typst symbols into individual letters with spaces.
	result = addImplicitMultiplicationSpaces(result);

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
 * Process table cell content that may contain inline math
 *
 * Handles mixed content like "Value: $z_i$" by:
 * 1. Extracting inline math segments ($...$)
 * 2. Converting math with convertLatexToTypstMath
 * 3. Escaping only the text parts
 * 4. Reassembling with proper Typst math delimiters
 *
 * @param content - Cell content possibly containing inline math
 * @returns Processed content safe for Typst tables
 */
export function processTableCellContent(content: string): string {
	// Match inline math: $...$ (non-greedy, doesn't cross line breaks)
	// Capture: text before, math content, text after
	const parts: string[] = [];
	let lastIndex = 0;
	const mathRegex = /\$([^$\n]+)\$/g;
	let match;

	while ((match = mathRegex.exec(content)) !== null) {
		// Add text before this math segment (escaped)
		if (match.index > lastIndex) {
			parts.push(escapeTypst(content.slice(lastIndex, match.index)));
		}

		// Convert and add the math segment
		// Apply toFrenchDecimal first to convert decimal points to French commas
		const mathContent = match[1];
		const frenchMath = toFrenchDecimal(mathContent);
		const typstMath = convertLatexToTypstMath(frenchMath);
		parts.push(`$${typstMath}$`);

		lastIndex = match.index + match[0].length;
	}

	// Add remaining text after last math segment (escaped)
	if (lastIndex < content.length) {
		parts.push(escapeTypst(content.slice(lastIndex)));
	}

	return parts.join('');
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
 * NOTE: External URLs (http/https) are kept as-is here, but the Typst WASM
 * compiler cannot actually load them. The transpileImage function handles
 * this by generating a placeholder for external URLs instead.
 *
 * @param src - Image source (relative path or URL)
 * @param basePath - Base path for relative images
 * @returns Resolved image path for Typst
 */
export function resolveImagePath(src: string, basePath: string): string {
	// Keep URLs as-is (handled specially in transpileImage for WASM compatibility)
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
