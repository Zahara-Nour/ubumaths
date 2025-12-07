/**
 * Custom Markdown Parser - Type Definitions
 * ==========================================
 *
 * Types for parser configuration, results, and internal structures.
 *
 * @module custom-markdown/types/parser
 */

// ============================================================================
// PARSE OPTIONS
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
// PARSE RESULT
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

// ============================================================================
// MATH PLACEHOLDER
// ============================================================================

/**
 * Math placeholder for extraction/replacement during parsing
 */
export interface MathPlaceholder {
	placeholder: string; // Unique placeholder string (e.g., "__MATH_0__")
	latex: string; // Original LaTeX content
	isBlock: boolean; // true for $$...$$ (block), false for $...$ (inline)
	startIndex: number; // Original position in source text
	endIndex: number; // Original end position in source text
	/** Whether this math expression contains \placeholder commands */
	hasPrompts?: boolean;
	/** Extracted prompt indices from \placeholder[N]{} commands */
	promptIndices?: number[];
}

// ============================================================================
// RENDER OPTIONS
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
