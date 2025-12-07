/**
 * Custom Markdown AST - Type Definitions
 * =======================================
 *
 * Abstract Syntax Tree node types for the custom markdown parser.
 * Includes all node types for representing parsed markdown content.
 *
 * Node categories:
 * - Inline nodes: text, math-inline, line-break, blank
 * - Block nodes: paragraph, heading, list, table, math-block, image, etc.
 * - Special nodes: document (root), list-item
 *
 * @module custom-markdown/types/ast
 */

// ============================================================================
// BASE NODE
// ============================================================================

/**
 * Base AST node
 */
export interface BaseNode {
	type: string;
}

// ============================================================================
// INLINE NODES
// ============================================================================

/**
 * Text node with optional formatting
 */
export interface TextNode extends BaseNode {
	type: 'text';
	content: string;
	bold?: boolean;
	italic?: boolean;
	code?: boolean;
}

/**
 * Inline math node ($...$)
 */
export interface MathInlineNode extends BaseNode {
	type: 'math-inline';
	latex: string; // LaTeX without $ delimiters
	/** Whether this expression contains \placeholder commands */
	hasPrompts?: boolean;
	/** Extracted prompt indices from \placeholder[N]{} commands */
	promptIndices?: number[];
}

/**
 * Line break node (hard break with \\ or soft break)
 */
export interface LineBreakNode extends BaseNode {
	type: 'line-break';
	hard?: boolean; // true for hard break (\\), false for soft break
}

/**
 * Blank node - represents a fill-in-the-blank input field
 *
 * Syntax in markdown: {{blank:N}} where N is the 1-based index
 *
 * @example
 * ```markdown
 * Calculate $2 + 3$ = {{blank:1}}
 * ```
 */
export interface BlankNode extends BaseNode {
	type: 'blank';
	/** 1-based index of the blank (corresponds to the N in {{blank:N}}) */
	index: number;
}

/**
 * Union of inline nodes (can appear within paragraphs, headings, etc.)
 */
export type InlineNode = TextNode | MathInlineNode | LineBreakNode | BlankNode;

// ============================================================================
// BLOCK NODES
// ============================================================================

/**
 * Paragraph node (container for inline content)
 */
export interface ParagraphNode extends BaseNode {
	type: 'paragraph';
	children: InlineNode[];
}

/**
 * Heading node (# to ######)
 */
export interface HeadingNode extends BaseNode {
	type: 'heading';
	level: 1 | 2 | 3 | 4 | 5 | 6;
	children: InlineNode[];
}

/**
 * List item node
 */
export interface ListItemNode extends BaseNode {
	type: 'list-item';
	children: ASTNode[]; // Can contain nested lists, paragraphs, etc.
}

/**
 * List node (ordered or unordered)
 */
export interface ListNode extends BaseNode {
	type: 'list';
	ordered: boolean; // true for numbered lists, false for bullet lists
	start?: number; // Starting number for ordered lists (default: 1)
	items: ListItemNode[];
}

/**
 * Table cell node
 */
export interface TableCellNode {
	content: string; // Can contain inline markdown (text, math, etc.)
	align?: 'left' | 'center' | 'right';
}

/**
 * Table node (GFM-style)
 */
export interface TableNode extends BaseNode {
	type: 'table';
	header: TableCellNode[];
	rows: TableCellNode[][];
	alignments: ('left' | 'center' | 'right')[];
}

/**
 * Block math node ($$...$$)
 */
export interface MathBlockNode extends BaseNode {
	type: 'math-block';
	latex: string; // LaTeX without $$ delimiters
	/** Whether this expression contains \placeholder commands */
	hasPrompts?: boolean;
	/** Extracted prompt indices from \placeholder[N]{} commands */
	promptIndices?: number[];
}

// ============================================================================
// IMAGE NODE & TYPES
// ============================================================================

/**
 * Classes of semantic sizes for images
 *
 * Used to define responsive sizing strategies for different contexts.
 * Each class maps to specific dimensions in HTML, LaTeX, and Typst formats.
 */
export type ImageSizeClass = 'inline' | 'small' | 'medium' | 'large' | 'full';

/**
 * Alignment options for images
 *
 * Controls how images are positioned within their container
 */
export type ImageAlignment = 'left' | 'center' | 'right';

/**
 * Mapping of image dimensions by output format
 *
 * Defines how a semantic size class translates to actual dimensions
 * in different output formats (HTML, LaTeX, Typst)
 */
export interface ImageSizeMapping {
	html: {
		width: string;
		maxWidth?: string;
		maxHeight?: string;
	};
	latex: string;
	typst: string;
}

/**
 * Default image size mappings by semantic class
 *
 * Provides standard dimension mappings for each size class across all formats.
 * Can be customized per document or exercise as needed.
 *
 * @example Using in rendering
 * ```typescript
 * const imageNode: ImageNode = { type: 'image', src: 'img.png', sizeClass: 'medium' };
 * const dimensions = DEFAULT_IMAGE_SIZE_MAPPINGS[imageNode.sizeClass || 'medium'];
 * // dimensions = { html: { width: '50%', maxWidth: '600px' }, latex: '0.5\\textwidth', typst: '50%' }
 * ```
 */
export const DEFAULT_IMAGE_SIZE_MAPPINGS: Record<ImageSizeClass, ImageSizeMapping> = {
	inline: {
		html: { width: '1.5em', maxHeight: '1.5em' },
		latex: '1em',
		typst: '1em'
	},
	small: {
		html: { width: '25%', maxWidth: '300px' },
		latex: '0.25\\textwidth',
		typst: '25%'
	},
	medium: {
		html: { width: '50%', maxWidth: '600px' },
		latex: '0.5\\textwidth',
		typst: '50%'
	},
	large: {
		html: { width: '75%', maxWidth: '900px' },
		latex: '0.75\\textwidth',
		typst: '75%'
	},
	full: {
		html: { width: '100%', maxWidth: '1200px' },
		latex: '\\textwidth',
		typst: '100%'
	}
};

/**
 * Image node
 */
export interface ImageNode extends BaseNode {
	type: 'image';
	src: string; // URL (relative or absolute)
	alt?: string; // Alt text for accessibility
	title?: string; // Optional title
	// Multi-format sizing support
	sizeClass?: ImageSizeClass;
	widthPercent?: number; // 0-100, percentage of text width
	alignment?: ImageAlignment;
	caption?: string;
	originalWidth?: number; // Original image width in pixels
	originalHeight?: number; // Original image height in pixels
}

/**
 * Horizontal rule node (---, ***, ___)
 */
export interface HorizontalRuleNode extends BaseNode {
	type: 'horizontal-rule';
}

/**
 * Blockquote node (> content)
 * Can contain any block content (paragraphs, lists, nested blockquotes)
 */
export interface BlockquoteNode extends BaseNode {
	type: 'blockquote';
	children: BlockNode[]; // Can contain paragraphs, lists, nested blockquotes
}

/**
 * Code block node (```language\ncode\n```)
 * Contains raw code with optional language identifier
 */
export interface CodeBlockNode extends BaseNode {
	type: 'code-block';
	code: string; // Raw code content (preserves all formatting)
	language?: string; // Optional language identifier (e.g., 'typescript', 'python')
}

/**
 * Union of block nodes (top-level document structure)
 */
export type BlockNode =
	| ParagraphNode
	| HeadingNode
	| ListNode
	| TableNode
	| MathBlockNode
	| ImageNode
	| HorizontalRuleNode
	| BlockquoteNode
	| CodeBlockNode;

// ============================================================================
// COMPOSITE NODES
// ============================================================================

/**
 * Union of all AST nodes
 */
export type ASTNode = InlineNode | BlockNode | ListItemNode;

/**
 * Document root (array of block nodes)
 */
export interface DocumentNode {
	type: 'document';
	children: BlockNode[];
}

// ============================================================================
// INPUT STATE
// ============================================================================

/**
 * Unified state for all input fields (text blanks and math prompts)
 *
 * Used by MarkdownRenderer to manage fill-in-the-blank inputs.
 * The `type` discriminant allows validation logic to differentiate
 * between text (from {{blank:N}}) and math (from \placeholder[N]{}) inputs.
 *
 * @example Text input state
 * ```typescript
 * const textInput: InputState = {
 *   index: 1,
 *   value: '42',
 *   type: 'text',
 *   isCorrect: true
 * };
 * ```
 *
 * @example Math input state
 * ```typescript
 * const mathInput: InputState = {
 *   index: 2,
 *   value: 'x^2 + 1',
 *   type: 'math',
 *   isCorrect: null // not yet validated
 * };
 * ```
 */
export interface InputState {
	/** 1-based index identifying the input field */
	index: number;
	/** Current value (text or LaTeX depending on type) */
	value: string;
	/** Discriminant: 'text' for {{blank:N}}, 'math' for \placeholder[N]{} */
	type: 'text' | 'math';
	/** Validation state: true=correct, false=incorrect, null=not validated */
	isCorrect: boolean | null;
}
