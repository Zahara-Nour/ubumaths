/**
 * Exercise Bank System - Type Definitions
 * ========================================
 *
 * Complete type system for the mathematical exercise bank, including:
 * - Database model (Exercise)
 * - AST nodes for markdown parsing
 * - Transpiler options
 * - Rendering options
 *
 * @module exercises/types
 */

// ============================================================================
// DATABASE MODEL
// ============================================================================

/**
 * Exercise stored in database
 *
 * Exercises contain markdown-formatted statements and solutions with LaTeX math
 * expressions wrapped in $...$ (inline) and $$...$$ (block).
 *
 * @example Markdown content
 * ```markdown
 * Résoudre l'équation suivante:
 *
 * 1. $2x + 3 = 7$
 * 2. $(x + 2)(x - 3) = 0$
 *
 * | x | f(x) |
 * |---|------|
 * | 0 | 0    |
 * | 1 | 2    |
 *
 * ![Graph](exercises/ex-123/graph.png)
 * ```
 */
export interface Exercise {
	/** Unique identifier (UUID) */
	id: string;

	// Metadata
	/** Exercise title (optional, for organization) */
	title?: string;

	/** Source reference (e.g., book name, author) */
	source?: string;

	/** Difficulty level: 1=easy, 2=medium, 3=hard */
	difficulty: 1 | 2 | 3;

	/** Tags for categorization (e.g., ['algèbre', 'équations', '3ème']) */
	tags: string[];

	// Content (markdown with LaTeX)
	/** Exercise statement in markdown with $...$ and $$...$$ for math */
	statement_md: string;

	/** Solution/correction in markdown with LaTeX math */
	solution_md: string;

	// Additional metadata
	/** Estimated completion time in minutes */
	estimated_time_minutes?: number;

	/** Applicable grade levels (e.g., ['3', '2', 'SPE_1']) */
	grade_levels?: string[];

	/** Topic category (e.g., 'Algèbre', 'Géométrie') */
	topic?: string;

	// Audit fields
	created_at: string;
	updated_at: string;
	created_by: string; // UUID of creator
}

/**
 * Partial exercise for creation (excludes auto-generated fields)
 */
export type ExerciseCreate = Omit<Exercise, 'id' | 'created_at' | 'updated_at'>;

/**
 * Partial exercise for updates (all fields optional except id)
 */
export type ExerciseUpdate = Partial<Omit<Exercise, 'id' | 'created_at' | 'created_by'>> & {
	id: string;
};

// ============================================================================
// AST NODE TYPES (for markdown parsing)
// ============================================================================

/**
 * Base AST node
 */
export interface BaseNode {
	type: string;
}

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
}

/**
 * Block math node ($$...$$)
 */
export interface MathBlockNode extends BaseNode {
	type: 'math-block';
	latex: string; // LaTeX without $$ delimiters
}

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
 * Image node
 */
export interface ImageNode extends BaseNode {
	type: 'image';
	src: string; // URL (relative or absolute)
	alt?: string; // Alt text for accessibility
	title?: string; // Optional title
}

/**
 * Horizontal rule node (---, ***, ___)
 */
export interface HorizontalRuleNode extends BaseNode {
	type: 'horizontal-rule';
}

/**
 * Line break node (hard break with \\ or soft break)
 */
export interface LineBreakNode extends BaseNode {
	type: 'line-break';
	hard?: boolean; // true for hard break (\\), false for soft break
}

/**
 * Union of inline nodes (can appear within paragraphs, headings, etc.)
 */
export type InlineNode = TextNode | MathInlineNode | LineBreakNode;

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
	| HorizontalRuleNode;

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
// PARSER OPTIONS
// ============================================================================

/**
 * Options for markdown parsing
 */
export interface ParseOptions {
	/**
	 * Whether to parse math expressions ($...$ and $$...$$)
	 * @default true
	 */
	parseMath?: boolean;

	/**
	 * Whether to parse images
	 * @default true
	 */
	parseImages?: boolean;

	/**
	 * Whether to parse tables
	 * @default true
	 */
	parseTables?: boolean;

	/**
	 * Whether to preserve whitespace
	 * @default false
	 */
	preserveWhitespace?: boolean;

	/**
	 * Base URL for resolving relative image paths
	 * @default ''
	 */
	baseImageUrl?: string;
}

// ============================================================================
// TRANSPILER OPTIONS
// ============================================================================

/**
 * Options for LaTeX transpilation
 */
export interface LatexTranspilerOptions {
	/**
	 * Document class (article, report, book)
	 * @default 'article'
	 */
	documentClass?: 'article' | 'report' | 'book';

	/**
	 * Paper size (a4paper, letterpaper, etc.)
	 * @default 'a4paper'
	 */
	paperSize?: string;

	/**
	 * Font size (10pt, 11pt, 12pt)
	 * @default '11pt'
	 */
	fontSize?: string;

	/**
	 * Language for babel package
	 * @default 'french'
	 */
	language?: string;

	/**
	 * Additional LaTeX packages to include
	 */
	extraPackages?: string[];

	/**
	 * Whether to include preamble (useful for standalone compilation)
	 * @default true
	 */
	includePreamble?: boolean;

	/**
	 * Base path for resolving image URLs
	 */
	imageBasePath?: string;

	/**
	 * Title for the document
	 */
	title?: string;

	/**
	 * Author for the document
	 */
	author?: string;
}

/**
 * Options for Typst transpilation
 */
export interface TypstTranspilerOptions {
	/**
	 * Paper size (a4, us-letter, etc.)
	 * @default 'a4'
	 */
	paperSize?: string;

	/**
	 * Font size in points
	 * @default 11
	 */
	fontSize?: number;

	/**
	 * Language setting
	 * @default 'fr'
	 */
	language?: string;

	/**
	 * Base path for resolving image URLs
	 */
	imageBasePath?: string;

	/**
	 * Whether to include document setup
	 * @default true
	 */
	includeSetup?: boolean;

	/**
	 * Title for the document
	 */
	title?: string;

	/**
	 * Author for the document
	 */
	author?: string;
}

// ============================================================================
// RENDERING OPTIONS
// ============================================================================

/**
 * Options for web rendering
 */
export interface RenderOptions {
	/**
	 * Whether to show images
	 * @default true
	 */
	showImages?: boolean;

	/**
	 * Base URL for resolving relative image paths
	 */
	baseImageUrl?: string;

	/**
	 * Additional CSS classes for the container
	 */
	className?: string;

	/**
	 * Whether to use MathLive for math rendering
	 * @default true
	 */
	useMathLive?: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Result of a parse operation
 */
export type ParseResult<T> =
	| {
			success: true;
			data: T;
	  }
	| {
			success: false;
			error: string;
			details?: unknown;
	  };

/**
 * Math placeholder for extraction/replacement during parsing
 */
export interface MathPlaceholder {
	placeholder: string; // Unique placeholder string (e.g., "__MATH_0__")
	latex: string; // Original LaTeX content
	isBlock: boolean; // true for $$...$$ (block), false for $...$ (inline)
	startIndex: number; // Original position in source text
	endIndex: number; // Original end position in source text
}

// ============================================================================
// EXPORT/IMPORT TYPES
// ============================================================================

/**
 * Clean exercise format for export (without id, timestamps, created_by)
 * This is the format used for JSON export and sharing between teachers
 */
export interface ExerciseExport {
	/** Format version for backwards compatibility */
	version: '1.0';

	// Metadata
	title?: string;
	source?: string;
	difficulty: 1 | 2 | 3;
	tags: string[];

	// Content
	statement_md: string;
	solution_md: string;

	// Additional metadata
	estimated_time_minutes?: number;
	grade_levels?: string[];
	topic?: string;
}

/**
 * YAML frontmatter for Markdown export
 * Used in the --- section at the top of exported .md files
 */
export interface ExerciseFrontmatter {
	/** Format version */
	version: '1.0';

	// Metadata
	title?: string;
	source?: string;
	difficulty: 1 | 2 | 3;
	tags: string[];
	estimated_time_minutes?: number;
	grade_levels?: string[];
	topic?: string;
}

/**
 * Result of an import operation
 */
export interface ImportResult {
	success: boolean;
	/** Number of exercises successfully imported */
	imported: number;
	/** Number of exercises skipped (duplicates) */
	skipped: number;
	/** Number of exercises that failed to import */
	failed: number;
	/** IDs of successfully imported exercises */
	importedIds: string[];
	/** Detailed error messages for failed imports */
	errors: Array<{
		index: number;
		title?: string;
		error: string;
	}>;
}

/**
 * Options for exporting exercises
 */
export interface ExportOptions {
	/** Format to export to */
	format: 'json' | 'markdown' | 'zip';
	/** Whether to include solution in export */
	includeSolution?: boolean;
	/** Whether to pretty-print JSON */
	prettyPrint?: boolean;
}

/**
 * Options for importing exercises
 */
export interface ImportOptions {
	/** How to handle duplicates (based on title + statement hash) */
	onDuplicate: 'skip' | 'replace' | 'create-copy';
	/** Validate exercises before import */
	validate?: boolean;
}

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

/**
 * Exercise template (system or user-created)
 */
export interface ExerciseTemplate {
	id: string;
	title: string;
	description?: string;

	/** Template data in clean export format */
	template_data: ExerciseExport;

	/** True for built-in system templates, false for user-created */
	is_system: boolean;

	// Audit fields (null for system templates)
	created_at?: string;
	created_by?: string; // UUID of creator (null for system templates)
}

/**
 * Template for creation (without id and timestamps)
 */
export type TemplateCreate = Omit<ExerciseTemplate, 'id' | 'created_at'>;

/**
 * System template loaded from static files
 */
export interface SystemTemplate {
	id: string;
	title: string;
	description?: string;
	template_data: ExerciseExport;
	/** Category for organizing templates (e.g., 'Algèbre', 'Géométrie') */
	category?: string;
	/** Preview image URL (optional) */
	preview?: string;
}

// ============================================================================
// IMAGE UPLOAD TYPES
// ============================================================================

/**
 * Result of an image upload operation
 */
export interface ImageUploadResult {
	/** Whether upload succeeded */
	success: boolean;
	/** Public URL of uploaded image (only if success=true) */
	url?: string;
	/** Storage path (only if success=true) */
	storagePath?: string;
	/** Error message (only if success=false) */
	error?: string;
}

/**
 * Result of an image delete operation
 */
export interface ImageDeleteResult {
	/** Whether deletion succeeded */
	success: boolean;
	/** Error message (only if success=false) */
	error?: string;
}

/**
 * Image upload progress (for UI feedback)
 */
export interface ImageUploadProgress {
	/** File being uploaded */
	file: File;
	/** Upload progress percentage (0-100) */
	progress: number;
	/** Status of upload */
	status: 'pending' | 'uploading' | 'success' | 'error';
	/** Result (only when status is 'success' or 'error') */
	result?: ImageUploadResult;
}

// ============================================================================
// SHARING & FAVORITES TYPES
// ============================================================================

/**
 * Exercise with sharing information
 */
export interface ExerciseWithSharing extends Exercise {
	/** Whether exercise is public and visible to all teachers */
	is_public: boolean;
	/** Whether current user has favorited this exercise */
	is_favorited?: boolean;
	/** Information about the creator (for public exercises) */
	creator?: {
		id: string;
		full_name?: string;
		email: string;
	};
}

/**
 * Favorite exercise record
 */
export interface ExerciseFavorite {
	user_id: string;
	exercise_id: string;
	created_at: string;
}
