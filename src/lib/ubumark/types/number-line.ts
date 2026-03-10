/**
 * Number Line Types - Type Definitions
 * =====================================
 *
 * Types for representing number lines (droites graduées) in the custom markdown AST.
 *
 * Features:
 * - Custom mathAST expressions for all numeric values (1/3, sqrt(2), \pi, etc.)
 * - Points with labels and colors
 * - Segments with open/closed endpoints
 * - Linear or logarithmic scale
 * - Hidden labels for interactive questions
 *
 * @module ubumark/types/number-line
 */

import type { BaseNode } from './ast';
import type { MathNode } from '$lib/mathAST/types';

// ============================================================================
// VALUE TYPES
// ============================================================================

/**
 * A value on the number line: expression in custom mathAST syntax + parsed AST
 *
 * The AST is the source of truth for:
 * - Display: toLatex(value.ast) → MathLive rendering
 * - Comparison: compareNumericNodes(a.ast, b.ast) → -1 | 0 | 1
 * - Positioning: evaluateNodeToApproximatedNumber(value.ast) → SVG x coordinate
 *
 * @example
 * ```typescript
 * { expression: "1/3", ast: <parsed MathNode> }
 * { expression: "sqrt(2)", ast: <parsed MathNode> }
 * { expression: "-3", ast: <parsed MathNode> }
 * ```
 */
export interface NumberLineValue {
	/** Expression in custom mathAST syntax: "1/3", "sqrt(2)", "2.5", "-3", "\\pi" */
	expression: string;
	/** Parsed AST — source of truth for display, comparison, and positioning */
	ast: MathNode;
}

// ============================================================================
// POINT AND SEGMENT TYPES
// ============================================================================

/**
 * A labeled point on the number line
 *
 * @example
 * ```typescript
 * { label: "A", value: { expression: "sqrt(2)", ast: ... }, color: "red" }
 * ```
 */
export interface NumberLinePoint {
	/** Display label (e.g., "A", "B") */
	label: string;
	/** Position on the line */
	value: NumberLineValue;
	/** Optional CSS color */
	color?: string;
}

/**
 * A segment (interval) on the number line
 *
 * Uses French mathematical notation for open/closed endpoints:
 * - [ = closed (filled circle)
 * - ] = open (empty circle)
 *
 * @example
 * ```typescript
 * // [1, 3] — closed interval
 * { start: ..., end: ..., startOpen: false, endOpen: false }
 * // ]1, 3[ — open interval
 * { start: ..., end: ..., startOpen: true, endOpen: true }
 * ```
 */
export interface NumberLineSegment {
	/** Start value */
	start: NumberLineValue;
	/** End value */
	end: NumberLineValue;
	/** true = open endpoint (] in French notation) */
	startOpen: boolean;
	/** true = open endpoint ([ in French notation) */
	endOpen: boolean;
	/** Optional CSS color */
	color?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Scale type for the number line
 */
export type NumberLineScale = 'linear' | 'log';

/**
 * Configuration for the number line display
 */
export interface NumberLineConfig {
	/** Minimum value (left bound) */
	start: NumberLineValue;
	/** Maximum value (right bound) */
	end: NumberLineValue;
	/** Minor graduation step */
	step: NumberLineValue;
	/** One major graduation every N minor graduations (default: 1) */
	major: number;
	/** Values to display as labels (default: major graduations) */
	labels: NumberLineValue[];
	/** Labels to hide and replace with "?" (for student exercises) */
	hidden: NumberLineValue[];
	/** Show arrows at line endpoints */
	arrows: boolean;
	/** Scale type */
	scale: NumberLineScale;
}

// ============================================================================
// AST NODE
// ============================================================================

/**
 * Number Line AST Node
 *
 * Represents a complete number line visualization with:
 * - Configurable range, step, and graduations
 * - Named points with labels and colors
 * - Colored segments with open/closed endpoints
 * - Hidden labels for interactive exercises
 *
 * @example Basic number line
 * ```
 * ```line
 * start: -3
 * end: 5
 * step: 1
 * ```
 * ```
 *
 * @example With points and segments
 * ```
 * ```line
 * start: -3
 * end: 5
 * step: 0.5
 * major: 2
 * points: A=sqrt(2) red, B=-1 blue
 * segments: [-1, 3] green, ]3, 5[ orange
 * ```
 * ```
 */
export interface NumberLineNode extends BaseNode {
	type: 'number-line';
	/** Display configuration */
	config: NumberLineConfig;
	/** Named points on the line */
	points: NumberLinePoint[];
	/** Segments (intervals) on the line */
	segments: NumberLineSegment[];
}

// ============================================================================
// PARSER TYPES
// ============================================================================

/**
 * Parser error information
 */
export interface NumberLineParseError {
	/** Error message */
	message: string;
	/** Line number where error occurred (1-based, relative to block start) */
	line?: number;
	/** The problematic line content */
	content?: string;
}

/**
 * Parser warning information (non-fatal issues)
 */
export interface NumberLineParseWarning {
	/** Warning message */
	message: string;
	/** Line number where warning occurred (1-based) */
	line?: number;
	/** Additional context */
	context?: string;
}

/**
 * Result of parsing a number line block
 */
export interface NumberLineParseResult {
	/** Parsed node, null if parsing failed */
	node: NumberLineNode | null;
	/** Errors encountered during parsing (fatal) */
	errors: NumberLineParseError[];
	/** Warnings encountered during parsing (non-fatal) */
	warnings: NumberLineParseWarning[];
}

/**
 * Block range for number line detection
 */
export interface NumberLineBlockRange {
	/** Start line index (0-based, inclusive) */
	startIndex: number;
	/** End line index (0-based, inclusive) */
	endIndex: number;
}
