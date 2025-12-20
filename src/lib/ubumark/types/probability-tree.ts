/**
 * Probability Tree Types - Type Definitions
 * ==========================================
 *
 * Types for representing weighted probability trees in the custom markdown AST.
 *
 * Features:
 * - Flexible tree structure (unlimited depth and branches)
 * - Multiple probability formats (fraction, decimal, symbolic)
 * - Optional outcomes column
 * - Support for LaTeX in labels
 *
 * @module custom-markdown/types/probability-tree
 */

import type { BaseNode } from './ast';

// ============================================================================
// PROBABILITY VALUE TYPES
// ============================================================================

/**
 * Format of a probability value
 *
 * - 'fraction': e.g., "1/2", "3/5"
 * - 'decimal': e.g., "0.5", "0.333"
 * - 'symbolic': e.g., "P(A)", "P(A|B)", non-numeric expression
 * - 'placeholder': e.g., "...", "???", "?" for fill-in-the-blank exercises
 */
export type ProbabilityFormat = 'fraction' | 'decimal' | 'symbolic' | 'placeholder';

/**
 * Probability value representation
 *
 * Supports fractions, decimals, and symbolic expressions.
 * The numeric value is computed when possible for calculations.
 *
 * @example Fraction
 * ```typescript
 * { display: "1/2", numeric: 0.5, format: 'fraction' }
 * ```
 *
 * @example Symbolic (non-computable)
 * ```typescript
 * { display: "P(A|B)", numeric: null, format: 'symbolic' }
 * ```
 */
export interface ProbabilityValue {
	/** Display string exactly as written (e.g., "1/2", "0.5", "P(A)") */
	display: string;
	/** Numeric value if computable (0-1), null for symbolic expressions */
	numeric: number | null;
	/** Original format of the probability */
	format: ProbabilityFormat;
}

// ============================================================================
// TREE NODE TYPES
// ============================================================================

/**
 * A branch in the probability tree
 *
 * Connects a parent node to a child node with an event label and probability.
 *
 * @example
 * ```
 * Rouge:3/5
 * ```
 * Becomes: { eventLabel: "Rouge", probability: { display: "3/5", numeric: 0.6, format: 'fraction' }, child: ... }
 */
export interface ProbTreeBranch {
	/** Event label on the branch (e.g., "Pile", "Rouge", "$A \\cap B$") */
	eventLabel: string;
	/** Probability associated with this branch */
	probability: ProbabilityValue;
	/** Child node at the end of this branch */
	child: ProbTreeNode;
}

/**
 * A node in the probability tree
 *
 * Can be either an internal node (with branches) or a leaf node (terminal).
 * Each node has a unique ID for tracking and interactivity.
 */
export interface ProbTreeNode {
	/** Unique node ID for tracking (auto-generated, format: "node-{depth}-{index}") */
	id: string;
	/** Optional label at this node (usually empty for internal nodes) */
	label?: string;
	/** Outcome expression at leaf (e.g., "P(R \\cap R) = 6/20") */
	outcome?: string;
	/** Outgoing branches from this node (empty for leaf nodes) */
	branches: ProbTreeBranch[];
	/** Depth level in the tree (0 = root) */
	depth: number;
	/** Whether this is a leaf node (no branches) */
	isLeaf: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Probability tree configuration options
 *
 * Parsed from the header section of the probtree block.
 */
export interface ProbTreeConfig {
	/** Label for the root node (default: empty string) */
	rootLabel: string;
	/** Whether to show outcomes column on the right (default: false) */
	showOutcomes: boolean;
	/** Whether to show intersection probability P(A ∩ B) at leaves (default: false) */
	showIntersection: boolean;
}

// ============================================================================
// PROBABILITY TREE NODE
// ============================================================================

/**
 * Probability Tree AST Node
 *
 * Represents a complete probability tree with:
 * - Root node containing the tree structure
 * - Configuration options
 * - Computed metadata (depth, leaf count)
 *
 * @example Basic coin flip
 * ```
 * ```probtree
 * root: Piece
 *
 * Pile:1/2
 *   Pile:1/2, P(PP)=1/4
 *   Face:1/2, P(PF)=1/4
 * Face:1/2
 *   Pile:1/2, P(FP)=1/4
 *   Face:1/2, P(FF)=1/4
 * ```
 * ```
 *
 * @example Urn without replacement
 * ```
 * ```probtree
 * root: Urne
 * outcomes: true
 *
 * Rouge:3/5
 *   Rouge:2/4, P(RR)=6/20
 *   Bleue:2/4, P(RB)=6/20
 * Bleue:2/5
 *   Rouge:3/4, P(BR)=6/20
 *   Bleue:1/4, P(BB)=2/20
 * ```
 * ```
 */
export interface ProbabilityTreeNode extends BaseNode {
	type: 'probability-tree';
	/** Root node of the tree */
	root: ProbTreeNode;
	/** Configuration options */
	config: ProbTreeConfig;
	/** Maximum depth of the tree (0 = only root) */
	maxDepth: number;
	/** Total number of leaf nodes */
	leafCount: number;
}

// ============================================================================
// PARSER TYPES
// ============================================================================

/**
 * Parser error information
 */
export interface ProbTreeParseError {
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
export interface ProbTreeParseWarning {
	/** Warning message */
	message: string;
	/** Line number where warning occurred (1-based) */
	line?: number;
	/** Additional context */
	context?: string;
}

/**
 * Result of parsing a probability tree block
 */
export interface ProbTreeParseResult {
	/** Parsed node, null if parsing failed */
	node: ProbabilityTreeNode | null;
	/** Errors encountered during parsing (fatal) */
	errors: ProbTreeParseError[];
	/** Warnings encountered during parsing (non-fatal) */
	warnings: ProbTreeParseWarning[];
}

/**
 * Block range for probtree detection
 */
export interface ProbTreeBlockRange {
	/** Start line index (0-based, inclusive) */
	startIndex: number;
	/** End line index (0-based, inclusive) */
	endIndex: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Path through the tree (for highlighting)
 *
 * Array of node IDs from root to a specific node.
 */
export type TreePath = string[];

/**
 * Cumulative probability along a path
 */
export interface CumulativeProbability {
	/** The path (node IDs) */
	path: TreePath;
	/** Display string for the cumulative probability */
	display: string;
	/** Numeric value if all probabilities are computable */
	numeric: number | null;
	/** Calculation breakdown (e.g., "1/2 × 1/2 = 1/4") */
	calculation: string;
}
