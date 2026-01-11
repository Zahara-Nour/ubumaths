/**
 * Variation (Monotonicity) Study Types
 *
 * Type definitions for analyzing the monotonicity of mathematical expressions.
 * This module studies how functions increase or decrease over intervals by:
 * 1. Computing the derivative f'(x)
 * 2. Finding critical points where f'(x) = 0
 * 3. Analyzing the sign of f'(x) using the sign module
 * 4. Determining intervals of increase/decrease
 * 5. Finding local/global extrema
 * 6. Computing limits at domain boundaries
 *
 * @module mathAST/variations/types
 */

import type { MathNode } from '../types';
import type { Domain, Interval } from '../domain/types';
import type { SignAnalysisResult } from '../sign/types';
import type { Verbosity } from '../common/verbosity';

// =============================================================================
// Monotonicity Types
// =============================================================================

/**
 * Monotonicity behavior of a function over an interval.
 *
 * - 'increasing': f(x1) < f(x2) when x1 < x2 (f' > 0)
 * - 'decreasing': f(x1) > f(x2) when x1 < x2 (f' < 0)
 * - 'constant': f(x1) = f(x2) for all x1, x2 (f' = 0)
 * - 'unknown': monotonicity cannot be determined
 */
export type Monotonicity = 'increasing' | 'decreasing' | 'constant' | 'unknown';

/**
 * An interval annotated with monotonicity information.
 *
 * @example
 * // f(x) = x^2 is decreasing on ]-infinity, 0[
 * {
 *   interval: { kind: 'interval', lower: negInfinity(), upper: openEndpoint(0) },
 *   monotonicity: 'decreasing',
 *   derivativeSign: 'negative',
 *   reason: 'f\'(x) = 2x < 0 for x < 0'
 * }
 */
export interface MonotonicInterval {
	/** The interval on which the monotonicity applies */
	readonly interval: Interval;

	/** The monotonicity behavior over this interval */
	readonly monotonicity: Monotonicity;

	/** The sign of the derivative over this interval */
	readonly derivativeSign: 'positive' | 'negative' | 'zero' | 'unknown';

	/** Pedagogical explanation for the monotonicity determination */
	readonly reason?: string;
}

// =============================================================================
// Extremum Types
// =============================================================================

/**
 * Type of extremum (minimum or maximum, local or global).
 *
 * - 'local_minimum': smallest value in a neighborhood
 * - 'local_maximum': largest value in a neighborhood
 * - 'global_minimum': smallest value over the entire domain
 * - 'global_maximum': largest value over the entire domain
 */
export type ExtremumType = 'local_minimum' | 'local_maximum' | 'global_minimum' | 'global_maximum';

/**
 * Information about an extremum of the function.
 *
 * @example
 * // Minimum of f(x) = x^2 at x = 0
 * {
 *   x: { type: 'number', value: '0' },
 *   xApproximate: 0,
 *   y: { type: 'number', value: '0' },
 *   yApproximate: 0,
 *   type: 'global_minimum',
 *   exact: true
 * }
 */
export interface ExtremumInfo {
	/** The x-coordinate of the extremum (symbolic form) */
	readonly x: MathNode;

	/** Numeric approximation of x (for ordering and display) */
	readonly xApproximate?: number;

	/** The y-coordinate (function value) at the extremum (symbolic form) */
	readonly y: MathNode;

	/** Numeric approximation of y */
	readonly yApproximate?: number;

	/** Type of extremum (local/global, min/max) */
	readonly type: ExtremumType;

	/** Whether the extremum is exact (algebraic) or only approximate (numeric) */
	readonly exact: boolean;
}

// =============================================================================
// Critical Point Types
// =============================================================================

/**
 * Nature of a critical point.
 *
 * - 'derivative_zero': f'(x) = 0 at this point
 * - 'derivative_undefined': f'(x) does not exist (cusp, corner, vertical tangent)
 */
export type CriticalPointNature = 'derivative_zero' | 'derivative_undefined';

/**
 * Information about a critical point of the function.
 *
 * Critical points are where f'(x) = 0 or f'(x) is undefined.
 * These are candidates for extrema.
 *
 * @example
 * // Critical point of f(x) = x^2 at x = 0
 * {
 *   x: { type: 'number', value: '0' },
 *   xApproximate: 0,
 *   y: { type: 'number', value: '0' },
 *   yApproximate: 0,
 *   nature: 'derivative_zero',
 *   exact: true
 * }
 */
export interface CriticalPointInfo {
	/** The x-coordinate of the critical point (symbolic form) */
	readonly x: MathNode;

	/** Numeric approximation of x (for ordering and display) */
	readonly xApproximate?: number;

	/** The y-coordinate (function value) at the critical point (symbolic form) */
	readonly y?: MathNode;

	/** Numeric approximation of y */
	readonly yApproximate?: number;

	/** Nature of the critical point */
	readonly nature: CriticalPointNature;

	/** Whether the critical point is exact (algebraic) or only approximate (numeric) */
	readonly exact: boolean;
}

// =============================================================================
// Boundary Limit Types
// =============================================================================

/**
 * Special limit values at domain boundaries.
 */
export type LimitValue = MathNode | 'infinity' | 'negative_infinity' | 'indeterminate';

/**
 * Limit of the function at a domain boundary.
 *
 * Used to determine global extrema and asymptotic behavior.
 *
 * @example
 * // lim_{x -> +infinity} 1/x = 0
 * {
 *   point: { type: 'infinity', sign: 'positive' },
 *   limit: { type: 'number', value: '0' },
 *   approximate: 0
 * }
 */
export interface BoundaryLimit {
	/** The boundary point (may be infinity or a finite excluded point) */
	readonly point: MathNode;

	/** The limit value at the boundary */
	readonly limit: LimitValue;

	/** Numeric approximation of the limit (if finite) */
	readonly approximate?: number;

	/** Direction of approach: 'left', 'right', or 'both' */
	readonly direction?: 'left' | 'right' | 'both';
}

// =============================================================================
// Step Recording Types
// =============================================================================

/**
 * Phase of the variation analysis.
 *
 * - 'derivative': Computing the derivative f'(x)
 * - 'zeros': Finding zeros of f'(x) (critical points)
 * - 'sign': Analyzing the sign of f'(x)
 * - 'monotonicity': Determining increase/decrease intervals
 * - 'extrema': Identifying local and global extrema
 * - 'limits': Computing limits at domain boundaries
 */
export type VariationPhase =
	| 'derivative'
	| 'zeros'
	| 'sign'
	| 'monotonicity'
	| 'extrema'
	| 'limits';

/**
 * A single step in the variation analysis process (for pedagogical display).
 *
 * Steps are recorded to show students how the variation study was performed.
 *
 * @example
 * {
 *   id: 1,
 *   phase: 'derivative',
 *   description: 'Compute the derivative',
 *   detail: 'f\'(x) = 2x'
 * }
 */
export interface VariationStep {
	/** Unique step identifier */
	readonly id: number;

	/** Phase of the analysis this step belongs to */
	readonly phase: VariationPhase;

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
 * Complete result of a variation analysis (monotonicity study).
 *
 * Contains the expression, its derivative, critical points, monotonic intervals,
 * extrema, and optionally boundary limits.
 *
 * @example
 * // Variation study of f(x) = x^2
 * {
 *   expression: { type: 'superscript', base: x, superscript: 2 },
 *   derivative: { type: 'multiplication', ... }, // 2x
 *   variable: 'x',
 *   domain: { kind: 'universal' },
 *   derivativeSign: { ... }, // Sign analysis of 2x
 *   criticalPoints: [{ x: 0, nature: 'derivative_zero', ... }],
 *   monotonicIntervals: [
 *     { interval: ]-infinity, 0[, monotonicity: 'decreasing', ... },
 *     { interval: ]0, +infinity[, monotonicity: 'increasing', ... }
 *   ],
 *   extrema: [{ x: 0, y: 0, type: 'global_minimum', ... }]
 * }
 */
export interface VariationResult {
	/** The expression being analyzed */
	readonly expression: MathNode;

	/** The derivative of the expression */
	readonly derivative: MathNode;

	/** The variable with respect to which variation is analyzed */
	readonly variable: string;

	/** The domain of the expression */
	readonly domain: Domain;

	/** Sign analysis of the derivative */
	readonly derivativeSign: SignAnalysisResult;

	/** Critical points of the function (ordered by x value) */
	readonly criticalPoints: readonly CriticalPointInfo[];

	/** Monotonic intervals partitioning the domain */
	readonly monotonicIntervals: readonly MonotonicInterval[];

	/** Extrema of the function */
	readonly extrema: readonly ExtremumInfo[];

	/** Limits at domain boundaries (optional) */
	readonly boundaryLimits?: readonly BoundaryLimit[];

	/** Steps taken during the analysis (for pedagogy) */
	readonly steps?: readonly VariationStep[];

	/** Warnings encountered during analysis */
	readonly warnings?: readonly string[];
}

// =============================================================================
// Options Types
// =============================================================================

/**
 * Options for variation analysis.
 */
export interface VariationOptions {
	/** Variable to analyze (default: 'x') */
	readonly variable?: string;

	/** Domain to analyze over (default: computed from expression) */
	readonly domain?: Domain;

	/** Verbosity level for step recording */
	readonly verbosity?: Verbosity;

	/** Include limits at domain boundaries (default: true) */
	readonly includeBoundaryLimits?: boolean;

	/** Allow numeric sampling as fallback for sign determination (default: true) */
	readonly numericFallback?: boolean;

	/** Tolerance for numeric comparisons (default: 1e-10) */
	readonly tolerance?: number;

	/** Throw error if analysis cannot be completed (default: false) */
	readonly strictMode?: boolean;
}

/**
 * Default options for variation analysis.
 */
export const DEFAULT_VARIATION_OPTIONS: Required<Omit<VariationOptions, 'variable' | 'domain'>> = {
	verbosity: 'summarized',
	includeBoundaryLimits: true,
	numericFallback: true,
	tolerance: 1e-10,
	strictMode: false
};

// =============================================================================
// Error Types
// =============================================================================

/**
 * Error thrown when variation analysis fails.
 *
 * Includes context about what expression was being analyzed
 * and why the analysis failed.
 */
export class VariationError extends Error {
	/**
	 * Create a new VariationError.
	 *
	 * @param message - Error message
	 * @param expression - The expression being analyzed (optional)
	 * @param phase - The phase where the error occurred (optional)
	 * @param details - Additional error details (optional)
	 */
	constructor(
		message: string,
		public readonly expression?: MathNode,
		public readonly phase?: VariationPhase,
		public readonly details?: string
	) {
		super(message);
		this.name = 'VariationError';
	}
}
