/**
 * Limit Module Types
 *
 * Type definitions for the symbolic limit evaluation module.
 *
 * @module mathAST/limits/types
 */

import type { MathNode } from '../types';

// =============================================================================
// Limit Direction
// =============================================================================

/**
 * Direction of approach for limit evaluation.
 */
export type LimitDirection = 'left' | 'right' | 'both';

// =============================================================================
// Limit Status
// =============================================================================

/**
 * Status indicating the outcome of limit evaluation.
 */
export type LimitStatus =
	| 'exact' // Exact symbolic limit found
	| 'indeterminate' // Indeterminate form (0/0, ∞/∞, etc.)
	| 'does-not-exist' // Limit does not exist (different left/right limits)
	| 'infinite' // Limit is +∞ or -∞
	| 'unsupported'; // Cannot evaluate

/**
 * Indeterminate form type for L'Hôpital detection.
 */
export type IndeterminateForm = '0/0' | '∞/∞' | '0*∞' | '∞-∞' | '0^0' | '∞^0' | '1^∞' | 'none';

// =============================================================================
// Verbosity Levels
// =============================================================================

import type { Verbosity } from '../common/verbosity.js';

/**
 * Verbosity levels for step recording.
 * Alias to the common Verbosity type for backwards compatibility.
 *
 * @see Verbosity in common/verbosity.ts
 */
export type LimitVerbosity = Verbosity;

// =============================================================================
// Step Types
// =============================================================================

/**
 * Rule or technique applied during limit evaluation.
 */
export type LimitRule =
	| 'known-limit' // Match from known limits table
	| 'direct-substitution' // f(a) exists and is finite
	| 'factorization' // Factor and cancel
	| 'rationalization' // Multiply by conjugate
	| 'lhopital' // L'Hôpital's rule
	| 'squeeze' // Squeeze theorem
	| 'algebraic-simplification' // Algebraic manipulation
	| 'infinity-analysis' // Behavior at infinity
	| 'one-sided' // One-sided limit analysis
	| 'linearity' // lim(af + bg) = a*lim(f) + b*lim(g)
	| 'product' // lim(fg) = lim(f) * lim(g)
	| 'quotient' // lim(f/g) = lim(f) / lim(g)
	| 'composition' // lim(f(g)) under continuity
	| 'derivative-definition'; // lim [f(x)-f(a)]/(x-a) = f'(a)

/**
 * A single step in the limit evaluation process (pedagogical).
 */
export interface LimitStep {
	/** Unique step ID */
	readonly id: number;

	/** Rule/technique applied */
	readonly rule: LimitRule;

	/** Description of this step in French */
	readonly description: string;

	/** Expression before this step */
	readonly before: MathNode;

	/** Expression after this step */
	readonly after: MathNode;

	/** Additional operand used in the operation */
	readonly operand?: MathNode;

	/** Minimum verbosity level to show this step */
	readonly verbosityLevel: LimitVerbosity;

	/** Technical note (e.g., indeterminate form detected) */
	readonly technicalNote?: string;
}

// =============================================================================
// Result Types
// =============================================================================

/**
 * Result of evaluating a limit.
 */
export interface LimitResult {
	/** The variable approaching the limit point */
	readonly variable: string;

	/** The point being approached */
	readonly approach: MathNode;

	/** Direction of approach */
	readonly direction: LimitDirection;

	/** Status of the limit evaluation */
	readonly status: LimitStatus;

	/** The limit value (null if doesn't exist or unsupported) */
	readonly value: MathNode | null;

	/** Indeterminate form encountered, if any */
	readonly indeterminateForm: IndeterminateForm;

	/** Primary rule/technique used to evaluate */
	readonly technique: LimitRule;

	/** Step-by-step evaluation process for pedagogy */
	readonly steps: readonly LimitStep[];

	/** Error message if unsupported */
	readonly error?: string;
}

/**
 * Result of evaluating one-sided limits separately.
 */
export interface OneSidedLimitResult {
	/** Result for limit from the left (x → a⁻) */
	readonly left: LimitResult | null;

	/** Result for limit from the right (x → a⁺) */
	readonly right: LimitResult | null;

	/** Whether the two-sided limit exists (left equals right) */
	readonly twoSidedExists: boolean;
}

// =============================================================================
// Options
// =============================================================================

/**
 * Options for limit evaluation.
 */
export interface LimitOptions {
	/** Verbosity level for step recording (default: 'summarized') */
	readonly verbosity?: LimitVerbosity;

	/** Maximum L'Hôpital iterations (default: 5) */
	readonly maxLhopitalIterations?: number;

	/** Allow numeric approximation fallback (default: false) */
	readonly allowNumeric?: boolean;

	/** Timeout in milliseconds (default: 5000) */
	readonly timeout?: number;
}

// =============================================================================
// Known Limit Entry
// =============================================================================

/**
 * Entry in the known limits table.
 */
export interface KnownLimitEntry {
	/** Unique identifier for this limit */
	readonly id: string;

	/** Human-readable name for this limit */
	readonly name: string;

	/** Description in French */
	readonly descriptionFr: string;

	/** The expression pattern to match */
	readonly pattern: MathNode;

	/** Variable name in the pattern */
	readonly variable: string;

	/** Point being approached */
	readonly approach: MathNode;

	/** Direction (defaults to 'both') */
	readonly direction?: LimitDirection;

	/** The known limit value */
	readonly value: MathNode;

	/** Optional conditions for validity */
	readonly conditions?: string;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Error thrown during limit evaluation.
 */
export class LimitError extends Error {
	constructor(
		message: string,
		public readonly code:
			| 'UNSUPPORTED_EXPRESSION'
			| 'INVALID_VARIABLE'
			| 'TIMEOUT'
			| 'MAX_ITERATIONS'
			| 'INTERNAL_ERROR'
	) {
		super(message);
		this.name = 'LimitError';
	}
}
