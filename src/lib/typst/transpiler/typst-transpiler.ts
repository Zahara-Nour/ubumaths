/**
 * Typst Transpiler - Convert AST to Typst
 * ========================================
 *
 * This module transpiles our markdown AST into compilable Typst documents.
 * Typst is a modern typesetting system that combines simplicity with power.
 *
 * Features:
 * - Full document generation with setup
 * - Support for all AST node types
 * - Image path resolution
 * - Special character escaping
 * - Customizable options
 *
 * Output can be compiled with the Typst CLI.
 *
 * @module exercises/transpilers/typst-transpiler
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
	TypstTranspilerOptions
} from '$lib/exercises/types';
import { getDimensionsForFormat } from '$lib/exercises/services/image-dimensions';
import { expressionToLatex } from '$lib/components/markdown/utils/math-utils';

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
// MAIN TRANSPILER FUNCTION
// ============================================================================

/**
 * Transpile AST to Typst document
 *
 * @param ast - Document AST to transpile
 * @param options - Transpiler options
 * @returns Complete Typst document string
 *
 * @example
 * const typst = transpileToTypst(ast, {
 *   title: 'Exercices de Mathematiques',
 *   author: 'Prof. Dupont'
 * });
 */
export function transpileToTypst(ast: DocumentNode, options: TypstTranspilerOptions = {}): string {
	const opts = { ...DEFAULT_OPTIONS, ...options };

	const setup = opts.includeSetup ? generateSetup(opts) : '';
	const body = transpileBody(ast, opts);

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
 * @param options - Transpiler options
 * @returns Typst setup string
 */
function generateSetup(options: Required<TypstTranspilerOptions>): string {
	const { paperSize, fontSize, language, title, author } = options;

	let setup = `#set page(paper: "${paperSize}")\n`;
	setup += `#set text(font: "New Computer Modern", size: ${fontSize}pt, lang: "${language}")\n`;
	setup += '#set par(justify: true)\n';
	setup += '#set heading(numbering: "1.1")\n\n';

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
// BODY TRANSPILATION
// ============================================================================

/**
 * Transpile document body (all block nodes)
 *
 * @param ast - Document AST
 * @param options - Transpiler options
 * @returns Typst body content
 */
function transpileBody(ast: DocumentNode, options: Required<TypstTranspilerOptions>): string {
	return ast.children.map((node) => transpileBlock(node, options)).join('\n\n');
}

/**
 * Transpile a single block node
 *
 * @param node - Block node to transpile
 * @param options - Transpiler options
 * @returns Typst string for this block
 */
function transpileBlock(node: BlockNode, options: Required<TypstTranspilerOptions>): string {
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
			return '#line(length: 100%)';

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
 * @returns Typst paragraph string
 */
function transpileParagraph(
	node: ParagraphNode,
	options: Required<TypstTranspilerOptions>
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
 * @returns Typst inline content
 */
function transpileInline(node: InlineNode, _options: Required<TypstTranspilerOptions>): string {
	switch (node.type) {
		case 'text': {
			let text = escapeTypst(node.content);
			if (node.bold) text = `*${text}*`;
			if (node.italic) text = `_${text}_`;
			if (node.code) text = `\`${text}\``;
			return text;
		}

		case 'math-inline': {
			const latex =
				node.syntax === 'custom' ? expressionToLatex(node.expression, 'custom') : node.expression;
			return `$${latex}$`;
		}

		case 'line-break':
			return node.hard ? ' \\\n' : '\n';

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
 * Maps markdown heading levels to Typst headings:
 * - # -> = Heading
 * - ## -> == Heading
 * - ### -> === Heading
 * - etc.
 *
 * @param node - Heading node
 * @param options - Transpiler options
 * @returns Typst heading
 */
function transpileHeading(node: HeadingNode, options: Required<TypstTranspilerOptions>): string {
	const content = node.children
		.map((child: InlineNode) => transpileInline(child, options))
		.join('');

	const prefix = '='.repeat(node.level);

	return `${prefix} ${content}`;
}

// ============================================================================
// LIST TRANSPILATION
// ============================================================================

/**
 * Transpile list node
 *
 * Uses numbered lists for ordered, bullet lists for unordered.
 *
 * @param node - List node
 * @param options - Transpiler options
 * @returns Typst list
 */
function transpileList(node: ListNode, options: Required<TypstTranspilerOptions>): string {
	const items = node.items
		.map((item: ListItemNode) => {
			const itemContent = item.children
				.map((child: ASTNode) => {
					if (child.type === 'list') {
						// Indent nested lists
						return transpileList(child, options)
							.split('\n')
							.map((line) => '  ' + line)
							.join('\n');
					}
					return transpileBlock(child as BlockNode, options);
				})
				.join('\n');

			if (node.ordered) {
				// Note: Typst automatically numbers items, we just use + prefix
				// The start number is not directly supported in basic Typst lists
				return `+ ${itemContent}`;
			}
			return `- ${itemContent}`;
		})
		.join('\n');

	return items;
}

// ============================================================================
// TABLE TRANSPILATION
// ============================================================================

/**
 * Transpile table node
 *
 * Uses Typst's table function with proper column alignment.
 *
 * @param node - Table node
 * @param options - Transpiler options
 * @returns Typst table
 */
function transpileTable(node: TableNode, _options: Required<TypstTranspilerOptions>): string {
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
// MATH TRANSPILATION
// ============================================================================

/**
 * Transpile math block node
 *
 * Uses $ ... $ with display modifier for block math.
 *
 * @param node - Math block node
 * @returns Typst math block
 */
function transpileMathBlock(node: MathBlockNode): string {
	const latex =
		node.syntax === 'custom' ? expressionToLatex(node.expression, 'custom') : node.expression;
	return `$ ${latex} $`;
}

// ============================================================================
// IMAGE TRANSPILATION
// ============================================================================

/**
 * Transpile image node with full multi-format sizing support
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
 * @param options - Transpiler options
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
// BLOCKQUOTE TRANSPILATION
// ============================================================================

/**
 * Transpile blockquote node
 *
 * Uses Typst's #quote block with block: true for block quotes.
 *
 * @param node - Blockquote node
 * @param options - Transpiler options
 * @returns Typst quote block
 */
function transpileBlockquote(
	node: BlockquoteNode,
	options: Required<TypstTranspilerOptions>
): string {
	const content = node.children.map((child) => transpileBlock(child, options)).join('\n\n');

	return `#quote(block: true)[${content}]`;
}

// ============================================================================
// CODE BLOCK TRANSPILATION
// ============================================================================

/**
 * Transpile code block node
 *
 * Uses Typst's raw block with language specification.
 *
 * @param node - Code block node
 * @returns Typst raw block
 */
function transpileCodeBlock(node: CodeBlockNode): string {
	const lang = node.language?.trim() || '';
	const langSpec = lang ? lang : '';

	return '```' + langSpec + '\n' + node.code + '\n```';
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
 * Convenience function that parses and transpiles in one step.
 * Useful for quick testing.
 *
 * @param markdown - Markdown text
 * @param options - Transpiler options
 * @returns Complete Typst document
 */
export async function markdownToTypst(
	markdown: string,
	options: TypstTranspilerOptions = {}
): Promise<string> {
	// Dynamic import to avoid circular dependency issues
	const { parseMarkdown } = await import('$lib/custom-markdown/parser/markdown-parser');
	const ast = parseMarkdown(markdown);
	return transpileToTypst(ast, options);
}
