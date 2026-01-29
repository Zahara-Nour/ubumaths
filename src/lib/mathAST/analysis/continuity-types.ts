/**
 * Continuity Analysis Types
 *
 * Type definitions for the continuity analysis module.
 * Provides unified structures for representing discontinuities,
 * continuity results, and analysis options.
 *
 * @module mathAST/analysis/continuity-types
 */

import type { MathNode } from '../types';
import type { Domain } from '../domain/types';
import type { Verbosity } from '../common/verbosity';

// =============================================================================
// Discontinuity Classification
// =============================================================================

/**
 * Type of discontinuity at a point.
 *
 * - `removable`: Limit exists but function is undefined or has different value
 *   (e.g., (x²-1)/(x-1) at x=1)
 * - `jump`: Left and right limits exist but differ
 *   (e.g., floor(x) at integers)
 * - `infinite`: One or both limits are infinite (vertical asymptote)
 *   (e.g., 1/x at x=0, tan(x) at x=π/2)
 * - `essential`: Oscillating or no limit exists
 *   (e.g., sin(1/x) at x=0)
 */
export type DiscontinuityType = 'removable' | 'jump' | 'infinite' | 'essential';

/**
 * Source/cause of a discontinuity.
 *
 * Identifies the mathematical operation or function responsible
 * for creating the discontinuity.
 */
export type DiscontinuitySource =
	| 'division' // Division by zero
	| 'sqrt' // Square root boundary
	| 'ln' // Natural logarithm boundary
	| 'log' // Logarithm boundary
	| 'tan' // Tangent undefined points
	| 'cot' // Cotangent undefined points
	| 'sec' // Secant undefined points
	| 'csc' // Cosecant undefined points
	| 'abs' // Absolute value corner (continuous but non-differentiable)
	| 'sign' // Sign function jump
	| 'floor' // Floor function jump
	| 'ceil' // Ceiling function jump
	| 'piecewise' // Piecewise-defined function boundary
	| 'other'; // Other sources

// =============================================================================
// Discontinuity Information
// =============================================================================

/**
 * Information about periodic discontinuities.
 *
 * Used for functions like tan, cot, sec, csc where discontinuities
 * occur at regular intervals.
 */
export interface PeriodicDiscontinuityInfo {
	/** The base/representative discontinuity point (e.g., π/2 for tan) */
	readonly basePoint: MathNode;
	/** The period between consecutive discontinuities (e.g., π for tan) */
	readonly period: MathNode;
	/** French description of the periodic pattern */
	readonly description: string;
}

/**
 * Complete information about a discontinuity at a specific point.
 */
export interface Discontinuity {
	/** The point of discontinuity */
	readonly point: MathNode;

	/** Type of discontinuity (removable, jump, infinite, essential) */
	readonly type: DiscontinuityType;

	/** Limit from the left (x → a⁻), null if doesn't exist */
	readonly leftLimit: MathNode | null;

	/** Limit from the right (x → a⁺), null if doesn't exist */
	readonly rightLimit: MathNode | null;

	/** Value of the function at the point, null if undefined */
	readonly functionValue: MathNode | null;

	/** Source/cause of the discontinuity */
	readonly source: DiscontinuitySource;

	/** French pedagogical description */
	readonly description: string;

	/** Information about periodic pattern, if applicable */
	readonly periodic?: PeriodicDiscontinuityInfo;
}

// =============================================================================
// Step Recording
// =============================================================================

/**
 * Rule applied during continuity analysis.
 */
export type ContinuityRule =
	| 'domain-computation' // Computing the domain
	| 'candidate-extraction' // Extracting discontinuity candidates
	| 'limit-evaluation' // Evaluating one-sided limits
	| 'discontinuity-classification' // Classifying discontinuity type
	| 'continuity-check' // Checking continuity at a point
	| 'periodic-detection'; // Detecting periodic patterns

/**
 * A single step in the continuity analysis process.
 */
export interface ContinuityStep {
	/** Unique step ID */
	readonly id: number;

	/** Rule/technique applied */
	readonly rule: ContinuityRule;

	/** Description of this step in French */
	readonly description: string;

	/** Point being analyzed, if applicable */
	readonly point?: MathNode;

	/** Result of the step */
	readonly result?: string;

	/** Minimum verbosity level to show this step */
	readonly verbosityLevel: Verbosity;

	/** Technical note (e.g., method used) */
	readonly technicalNote?: string;
}

// =============================================================================
// Result Types
// =============================================================================

/**
 * Result of continuity analysis.
 *
 * Contains the domain, all discontinuities found, and an overall
 * assessment of continuity on the domain.
 */
export interface ContinuityResult {
	/** The domain of definition */
	readonly domain: Domain;

	/** List of discontinuities found */
	readonly discontinuities: readonly Discontinuity[];

	/**
	 * Whether the function is continuous on its domain.
	 *
	 * True if:
	 * - All discontinuities are outside the domain (e.g., 1/x is continuous on its domain ℝ\{0})
	 * - There are no discontinuities at domain interior points
	 *
	 * Note: Removable discontinuities at excluded points don't affect this,
	 * but jump/essential discontinuities at domain boundaries may.
	 */
	readonly isContinuousOnDomain: boolean;

	/** The variable analyzed */
	readonly variable: string;

	/** Step-by-step analysis process for pedagogy */
	readonly steps?: readonly ContinuityStep[];
}

// =============================================================================
// Options
// =============================================================================

/**
 * Options for continuity analysis.
 */
export interface ContinuityOptions {
	/** Verbosity level for step recording (default: 'summarized') */
	readonly verbosity?: Verbosity;

	/**
	 * Standard interval to search for periodic discontinuities.
	 * Default: { min: -2π, max: 2π }
	 */
	readonly standardInterval?: { min: number; max: number };

	/**
	 * Maximum number of periodic points to enumerate.
	 * Default: 10
	 */
	readonly maxPeriodicPoints?: number;

	/**
	 * Whether to compute function values at discontinuity points.
	 * Default: true
	 */
	readonly computeFunctionValues?: boolean;

	/** Timeout in milliseconds (default: 5000) */
	readonly timeout?: number;
}

// =============================================================================
// Internal Types
// =============================================================================

/**
 * A candidate point for discontinuity analysis.
 * Internal type used during the analysis process.
 */
export interface DiscontinuityCandidate {
	/** The candidate point */
	readonly point: MathNode;

	/** Suspected source of potential discontinuity */
	readonly source: DiscontinuitySource;

	/** Information about periodic pattern, if applicable */
	readonly periodic?: PeriodicDiscontinuityInfo;
}
