/**
 * Ubumark AST - Type Definitions
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
 * @module ubumark/types/ast
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
	strikethrough?: boolean;
	highlight?: boolean;
}

/**
 * Inline math node ($...$)
 */
export interface MathInlineNode extends BaseNode {
	type: 'math-inline';
	/** Math expression in its original syntax (LaTeX or custom) */
	expression: string;
	/** Syntax used: 'latex' for $...$ or 'custom' for ~...~ */
	syntax: 'latex' | 'custom';
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
 * Link node - represents a hyperlink
 *
 * Syntax in markdown: [text](url) or [text](url "title")
 *
 * @example
 * ```markdown
 * Visit [our site](https://example.com)
 * Check [documentation](https://docs.example.com "Official docs")
 * ```
 */
export interface LinkNode extends BaseNode {
	type: 'link';
	/** The visible link text */
	text: string;
	/** The URL/href of the link */
	url: string;
	/** Optional title attribute (shown on hover) */
	title?: string;
}

/**
 * Hashtag node - represents a hashtag for categorization
 *
 * Syntax in markdown: #tag (must start with letter, supports accents)
 *
 * @example
 * ```markdown
 * Exercice de #mathematiques niveau #facile
 * #equation-second-degre #algebre_II
 * ```
 */
export interface HashtagNode extends BaseNode {
	type: 'hashtag';
	/** The tag name without the # prefix */
	tag: string;
}

/**
 * Mention node - represents a user mention
 *
 * Syntax in markdown: @username (must start with letter)
 *
 * @example
 * ```markdown
 * Bravo @alice pour cette solution !
 * Assigné à @jean.dupont et @user_123
 * ```
 */
export interface MentionNode extends BaseNode {
	type: 'mention';
	/** The username without the @ prefix */
	username: string;
}

/**
 * Hint reference node - renders as expandable hint button
 *
 * Syntax in markdown: {{hint:id}} where id references a hint in the exercise variation
 *
 * The hint ID must:
 * - Start with a letter (a-zA-Z)
 * - Can contain letters, numbers, dashes, underscores
 *
 * @example
 * ```markdown
 * Calculate the derivative. {{hint:derivative-rule}} Then simplify.
 * Use the formula {{hint:formula1}} to solve this equation.
 * ```
 */
export interface HintReferenceNode extends BaseNode {
	type: 'hint-reference';
	/** The hint ID (without "hint:" prefix) */
	hintId: string;
}

/**
 * Valid reference types for internal links
 */
export type InternalLinkReferenceType = 'chapter' | 'document' | 'exercise' | 'assessment';

/**
 * Internal link node - references internal resources
 *
 * Syntax in markdown: [[type:uuid|label]]
 *
 * Supported types:
 * - chapter: Link to a chapter/lesson
 * - document: Link to a document
 * - exercise: Link to an exercise
 * - assessment: Link to an assessment
 *
 * @example
 * ```markdown
 * Voir le [[chapter:550e8400-e29b-41d4-a716-446655440000|Chapitre Fractions]] pour plus de details.
 * Exercice similaire: [[exercise:123e4567-e89b-12d3-a456-426614174000|Exercice 5]]
 * ```
 */
export interface InternalLinkNode extends BaseNode {
	type: 'internal-link';
	/** The type of resource being referenced */
	referenceType: InternalLinkReferenceType;
	/** UUID of the referenced resource */
	uuid: string;
	/** Display label for the link */
	label: string;
}

/**
 * Union of inline nodes (can appear within paragraphs, headings, etc.)
 */
export type InlineNode =
	| TextNode
	| MathInlineNode
	| LineBreakNode
	| BlankNode
	| LinkNode
	| HashtagNode
	| MentionNode
	| HintReferenceNode
	| InternalLinkNode;

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
	/** True if there's a blank line between content and nested items (loose list) */
	loose?: boolean;
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
 *
 * Supports transposition via the `:table-h` directive:
 * - When `transpose: false` (default): Normal table with headers in first row
 * - When `transpose: true`: Table is transposed for display (rows become columns)
 *   The original header cells become the first column (displayed as headers)
 *
 * Supports double-entry tables via the `:table-cross` directive:
 * - When `cross: true`: Both first row AND first column are headers
 *   This is useful for multiplication tables, cross-reference tables, etc.
 *   The corner cell (row 0, col 0) is styled based on whether it has content.
 *
 * The AST stores the table as written in markdown. Transposition/cross is done by renderers.
 */
export interface TableNode extends BaseNode {
	type: 'table';
	header: TableCellNode[];
	rows: TableCellNode[][];
	alignments: ('left' | 'center' | 'right')[];
	/** When true, renderers transpose the table (headers become first column) */
	transpose?: boolean;
	/** When true, renderers treat first row AND first column as headers (double-entry table) */
	cross?: boolean;
}

/**
 * Block math node ($$...$$)
 */
export interface MathBlockNode extends BaseNode {
	type: 'math-block';
	/** Math expression in its original syntax (LaTeX or custom) */
	expression: string;
	/** Syntax used: 'latex' for $$...$$ or 'custom' for ~~...~~ */
	syntax: 'latex' | 'custom';
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
 *
 * Supports both standalone images and linked images (clickable).
 *
 * @example Standalone image
 * ```markdown
 * ![alt](image.png "title")
 * ```
 *
 * @example Linked image (clickable)
 * ```markdown
 * [![alt](image.png)](https://example.com)
 * [![alt](image.png "img title")](https://example.com "link title")
 * ```
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
	// Link support (for clickable images)
	href?: string; // Link URL when image is clickable
	linkTitle?: string; // Link title attribute (shown on hover)
}

// ============================================================================
// VIDEO NODE
// ============================================================================

/**
 * Video provider type
 *
 * Determines how the video should be rendered:
 * - 'html5': Native HTML5 video element for local/direct video files
 * - 'youtube': YouTube embed via iframe
 */
export type VideoProvider = 'html5' | 'youtube';

/**
 * Video node
 *
 * Supports HTML5 video files and YouTube embeds.
 * Uses the same sizing system as images (sizeClass, widthPercent, alignment).
 *
 * @example HTML5 video
 * ```markdown
 * !video[Demo](video.mp4){controls}
 * !video[Animation](animation.webm){autoplay loop muted size=medium}
 * ```
 *
 * @example YouTube embed
 * ```markdown
 * !video[Tutorial](https://youtube.com/watch?v=VIDEO_ID){size=large}
 * !video[Course](https://youtu.be/VIDEO_ID){align=center}
 * ```
 */
export interface VideoNode extends BaseNode {
	type: 'video';
	/** Video source URL (file path or YouTube URL) */
	src: string;
	/** Alt text for accessibility */
	alt?: string;

	// Provider detection (auto-detected from URL)
	/** Video provider: 'html5' for direct files, 'youtube' for YouTube */
	provider?: VideoProvider;
	/** YouTube video ID (extracted from URL if provider is 'youtube') */
	videoId?: string;

	// Sizing (same pattern as images)
	/** Semantic size class */
	sizeClass?: ImageSizeClass;
	/** Width as percentage (0-100) */
	widthPercent?: number;
	/** Horizontal alignment */
	alignment?: ImageAlignment;

	// Playback options
	/** Show video controls (default: true) */
	controls?: boolean;
	/** Auto-play video (default: false, requires muted in most browsers) */
	autoplay?: boolean;
	/** Loop video playback (default: false) */
	loop?: boolean;
	/** Mute video audio (default: false) */
	muted?: boolean;
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

// ============================================================================
// VARIATION TABLE NODE (imported from variation-table.ts)
// ============================================================================

// Re-export VariationTableNode for inclusion in BlockNode union
export type { VariationTableNode } from './variation-table';

// Re-export ProbabilityTreeNode for inclusion in BlockNode union
export type { ProbabilityTreeNode } from './probability-tree';

// Import the types for use in BlockNode union
import type { VariationTableNode } from './variation-table';
import type { ProbabilityTreeNode } from './probability-tree';

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
	| VideoNode
	| HorizontalRuleNode
	| BlockquoteNode
	| CodeBlockNode
	| VariationTableNode
	| ProbabilityTreeNode;

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
