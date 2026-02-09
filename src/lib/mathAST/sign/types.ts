/**
 * Sign Analysis Types
 *
 * Type definitions for analyzing the sign of mathematical expressions over intervals.
 * Used by the variations module (to study the sign of f' and determine monotonicity)
 * and by pedagogical displays (sign tables).
 *
 * ## Key design choice: exact symbolic bounds
 *
 * All interval bounds and zero values are stored as MathNodes (exact symbolic form),
 * not as floating-point numbers. Numeric approximations are only used for sorting
 * and comparison, never as interval bounds. This ensures that the final sign table
 * displays exact values (e.g. "f changes sign at x = √2", not "at x ≈ 1.414").
 *
 * @module mathAST/sign/types
 */

import type { MathNode } from '../types';
import type { Interval } from '$lib/math/intervals/types';
import type { Domain } from '../domain/types';
import type { Verbosity } from '../common/verbosity';

// =============================================================================
// Sign Types
// =============================================================================

/**
 * Sign of an expression over an interval.
 *
 * - 'positive': Expression is strictly positive (> 0) on the interval
 * - 'negative': Expression is strictly negative (< 0) on the interval
 * - 'zero': Expression is identically zero on the interval (typically a point interval {z})
 * - 'unknown': Sign cannot be determined. This happens when:
 *   1. Algebraic analysis failed (e.g. sums/differences whose sign depends on magnitudes)
 *      AND numeric sampling also failed or was disabled.
 *   2. The expression structure is not recognized.
 */
export type Sign = 'positive' | 'negative' | 'zero' | 'unknown';

// =============================================================================
// Signed Interval Types
// =============================================================================

/**
 * An interval annotated with the sign of an expression over it.
 *
 * @example
 * // f(x) = x - 2 is negative on ]-infinity, 2[
 * {
 *   interval: { kind: 'interval', lower: negInfinityEndpoint(), upper: openEndpoint(2) },
 *   sign: 'negative',
 *   reason: 'f(x) = x - 2 < 0 when x < 2'
 * }
 */
export interface SignedInterval {
	/** The interval on which the sign applies */
	readonly interval: Interval;

	/** The sign of the expression over this interval */
	readonly sign: Sign;

	/** Pedagogical explanation for why this sign was determined */
	readonly reason?: string;
}

// =============================================================================
// Zero Information Types
// =============================================================================

/**
 * Information about a zero (root) of an expression.
 *
 * Zeros are the partition points for sign analysis: the domain is split at
 * zeros into sub-intervals where the expression has constant sign (by IVT).
 *
 * ## Exact vs approximate
 *
 * The `value` field holds the **exact symbolic form** (e.g. sqrt(2) as a MathNode).
 * This is used as interval bounds in the final result, preserving exactness.
 * The `approximate` field is a numeric approximation used **only** for:
 * - Sorting zeros in order
 * - Deduplication (within tolerance)
 * - Checking domain membership
 *
 * @example
 * // Zero of x^2 - 2 at sqrt(2)
 * {
 *   value: { kind: 'function', name: 'sqrt', args: [{ kind: 'number', value: 2 }] },
 *   approximate: 1.4142135623730951,
 *   exact: true
 * }
 */
export interface ZeroInfo {
	/** The zero value as a MathNode — exact symbolic form used as interval bound */
	readonly value: MathNode;

	/** Numeric approximation used for sorting and comparison only (never as a bound) */
	readonly approximate?: number;

	/** Whether the zero is exact (algebraic) or only approximate (numeric) */
	readonly exact: boolean;
}

// =============================================================================
// Step Recording Types
// =============================================================================

/**
 * A single step in the sign analysis process (for pedagogical display).
 *
 * Steps are recorded to show students how the sign determination was made.
 *
 * @example
 * {
 *   id: 1,
 *   rule: 'solve_zeros',
 *   description: 'Solve f(x) = 0 to find zeros',
 *   detail: 'x - 2 = 0 gives x = 2'
 * }
 */
export interface SignAnalysisStep {
	/** Unique step identifier */
	readonly id: number;

	/** Rule or technique applied in this step */
	readonly rule: string;

	/** Human-readable description of the step */
	readonly description: string;

	/** Additional detail about the step computation */
	readonly detail?: string;

	/** Minimum verbosity level to include this step */
	readonly verbosityLevel?: Verbosity;
}

// =============================================================================
// Result Types
// =============================================================================

/**
 * Complete result of a sign analysis.
 *
 * Contains the expression, its zeros, and the sign over each interval
 * between zeros and domain boundaries.
 *
 * @example
 * // Sign analysis of f(x) = x - 2 over R
 * {
 *   expression: { kind: 'sum', operands: [x, -2] },
 *   variable: 'x',
 *   domain: { kind: 'universal' },
 *   zeros: [{ value: { kind: 'number', value: 2 }, approximate: 2, exact: true }],
 *   signedIntervals: [
 *     { interval: ]-infinity, 2[, sign: 'negative' },
 *     { interval: ]2, +infinity[, sign: 'positive' }
 *   ]
 * }
 */
export interface SignAnalysisResult {
	/** The expression being analyzed */
	readonly expression: MathNode;

	/** The variable with respect to which sign is analyzed */
	readonly variable: string;

	/** The domain of the expression */
	readonly domain: Domain;

	/** Zeros of the expression (ordered by value) */
	readonly zeros: readonly ZeroInfo[];

	/** Signed intervals partitioning the domain */
	readonly signedIntervals: readonly SignedInterval[];

	/** Steps taken during the analysis (for pedagogy) */
	readonly steps?: readonly SignAnalysisStep[];

	/** Warnings encountered during analysis */
	readonly warnings?: readonly string[];
}

// =============================================================================
// Options Types
// =============================================================================

/**
 * Options for sign analysis.
 */
export interface SignAnalysisOptions {
	/** Variable to analyze (default: 'x') */
	readonly variable?: string;

	/** Domain to analyze over (default: computed from expression) */
	readonly domain?: Domain;

	/** Verbosity level for step recording */
	readonly verbosity?: Verbosity;

	/** Throw error if sign cannot be determined (default: false) */
	readonly strictMode?: boolean;

	/**
	 * Allow numeric sampling as fallback for sign determination (default: true).
	 * When algebraic analysis returns 'unknown' (e.g. for sums/differences),
	 * sampling evaluates the expression at several points and checks consensus.
	 * This is reliable between consecutive zeros for continuous functions (IVT).
	 */
	readonly numericFallback?: boolean;

	/** Tolerance for numeric comparisons (default: 1e-10) */
	readonly tolerance?: number;
}

/**
 * Default options for sign analysis.
 */
export const DEFAULT_SIGN_OPTIONS: Required<Omit<SignAnalysisOptions, 'variable' | 'domain'>> = {
	verbosity: 'summarized',
	strictMode: false,
	numericFallback: true,
	tolerance: 1e-10
};

// =============================================================================
// Error Types
// =============================================================================

/**
 * Error thrown when sign analysis fails.
 *
 * Includes context about what expression was being analyzed
 * and why the analysis failed.
 */
export class SignAnalysisError extends Error {
	/**
	 * Create a new SignAnalysisError.
	 *
	 * @param message - Error message
	 * @param expression - The expression being analyzed (optional)
	 * @param details - Additional error details (optional)
	 */
	constructor(
		message: string,
		public readonly expression?: MathNode,
		public readonly details?: string
	) {
		super(message);
		this.name = 'SignAnalysisError';
	}
}
