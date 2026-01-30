/**
 * Differentiability Analysis Types
 *
 * Type definitions for the differentiability analysis module.
 * Provides unified structures for representing non-differentiable points,
 * differentiability results, and analysis options.
 *
 * @module mathAST/analysis/differentiability-types
 */

import type { MathNode } from '../types';
import type { Domain } from '../domain/types';
import type { Verbosity } from '../common/verbosity';
import type { Discontinuity, DiscontinuitySource } from './continuity-types';

// =============================================================================
// Non-Differentiability Classification
// =============================================================================

/**
 * Type of non-differentiability at a point.
 *
 * - `angular`: Left and right derivatives exist but differ (sharp corner)
 *   (e.g., |x| at x=0 has left derivative -1, right derivative +1)
 * - `cusp`: Both derivatives tend to infinity with same sign
 *   (e.g., x^(2/3) at x=0, both sides approach +infinity)
 * - `vertical_tangent`: Derivatives tend to infinity with opposite signs
 *   (e.g., x^(1/3) at x=0, left -> -infinity, right -> +infinity)
 * - `discontinuity`: Function is discontinuous at the point
 *   (e.g., 1/x at x=0, inherited from continuity analysis)
 * - `boundary`: Point is on the boundary of the domain
 *   (e.g., sqrt(x) at x=0, only right derivative exists)
 */
export type NonDifferentiabilityType =
	| 'angular'
	| 'cusp'
	| 'vertical_tangent'
	| 'discontinuity'
	| 'boundary';

/**
 * Source/cause of non-differentiability.
 *
 * Extends DiscontinuitySource with additional sources specific to
 * differentiability analysis.
 */
export type NonDifferentiabilitySource =
	| DiscontinuitySource
	| 'abs_composed' // |f(x)| at zeros of f
	| 'fractional_power_cusp' // x^(p/q) with 0 < p/q < 1, p even
	| 'fractional_power_vertical' // x^(p/q) with 0 < p/q < 1, p odd
	| 'sqrt_boundary' // sqrt(f(x)) at zeros of f (domain boundary)
	| 'ln_boundary' // ln(f(x)) at zeros of f (domain boundary)
	| 'power_boundary'; // f(x)^a at zeros of f when a < 1

// =============================================================================
// Derivative Limit Representation
// =============================================================================

/**
 * Represents the limit of a derivative as x approaches a point from one side.
 *
 * - A MathNode for finite numeric or symbolic values
 * - 'infinite' for +infinity
 * - '-infinite' for -infinity
 * - 'undefined' when the limit doesn't exist or can't be computed
 */
export type DerivativeLimit = MathNode | 'infinite' | '-infinite' | 'undefined';

// =============================================================================
// Non-Differentiable Point Information
// =============================================================================

/**
 * Information about periodic non-differentiability.
 *
 * Used for functions like |sin(x)| where non-differentiable points
 * occur at regular intervals.
 */
export interface PeriodicNonDifferentiabilityInfo {
	/** The base/representative non-differentiable point (e.g., 0 for |sin(x)|) */
	readonly basePoint: MathNode;
	/** The period between consecutive non-differentiable points (e.g., pi for |sin(x)|) */
	readonly period: MathNode;
	/** French description of the periodic pattern */
	readonly description: string;
}

/**
 * Complete information about a non-differentiable point.
 */
export interface NonDifferentiablePoint {
	/** The point of non-differentiability */
	readonly point: MathNode;

	/** Type of non-differentiability (angular, cusp, vertical_tangent, discontinuity, boundary) */
	readonly type: NonDifferentiabilityType;

	/** Source/cause of the non-differentiability */
	readonly source: NonDifferentiabilitySource;

	/** Whether the function is continuous at this point */
	readonly isContinuous: boolean;

	/** Left derivative limit (x -> a-) */
	readonly leftDerivative: DerivativeLimit;

	/** Right derivative limit (x -> a+) */
	readonly rightDerivative: DerivativeLimit;

	/** Associated discontinuity info, if the function is discontinuous */
	readonly discontinuity?: Discontinuity;

	/** French pedagogical description */
	readonly description: string;

	/** Information about periodic pattern, if applicable */
	readonly periodic?: PeriodicNonDifferentiabilityInfo;
}

// =============================================================================
// Domain Boundary Information
// =============================================================================

/**
 * Information about derivative behavior at a domain boundary.
 *
 * At domain boundaries, only one-sided derivatives may exist.
 * This captures the behavior of the derivative as we approach
 * the boundary from within the domain.
 */
export interface BoundaryBehavior {
	/** The boundary point */
	readonly point: MathNode;

	/** Which side of the boundary is within the domain */
	readonly side: 'left' | 'right';

	/** The limit of the derivative from within the domain */
	readonly derivativeLimit: DerivativeLimit;

	/** French pedagogical description */
	readonly description: string;
}

// =============================================================================
// Non-Differentiability Candidate (Internal)
// =============================================================================

/**
 * A candidate point for non-differentiability analysis.
 * Internal type used during the analysis process.
 */
export interface NonDifferentiabilityCandidate {
	/** The candidate point */
	readonly point: MathNode;

	/** Suspected source of potential non-differentiability */
	readonly source: NonDifferentiabilitySource;

	/** Information about periodic pattern, if applicable */
	readonly periodic?: PeriodicNonDifferentiabilityInfo;
}

// =============================================================================
// Step Recording
// =============================================================================

/**
 * Rule applied during differentiability analysis.
 */
export type DifferentiabilityRule =
	| 'domain-computation' // Computing the domain
	| 'continuity-analysis' // Checking continuity (discontinuities are non-differentiable)
	| 'candidate-extraction' // Extracting non-differentiability candidates
	| 'derivative-limit-evaluation' // Evaluating one-sided derivative limits
	| 'classification' // Classifying the type of non-differentiability
	| 'boundary-analysis' // Analyzing domain boundaries
	| 'periodic-detection'; // Detecting periodic patterns

/**
 * A single step in the differentiability analysis process.
 */
export interface DifferentiabilityStep {
	/** Unique step ID */
	readonly id: number;

	/** Rule/technique applied */
	readonly rule: DifferentiabilityRule;

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
 * Result of differentiability analysis.
 *
 * Contains the domain of differentiability, all non-differentiable points found,
 * boundary behavior, and an overall assessment.
 */
export interface DifferentiabilityResult {
	/** The domain of differentiability (domain of definition minus non-differentiable points) */
	readonly domain: Domain;

	/** List of non-differentiable points found */
	readonly nonDifferentiablePoints: readonly NonDifferentiablePoint[];

	/** Behavior at domain boundaries */
	readonly boundaryBehavior: readonly BoundaryBehavior[];

	/**
	 * Whether the function is differentiable on its entire domain of definition.
	 *
	 * True if there are no non-differentiable points within the domain
	 * (boundary points don't count against this).
	 */
	readonly isDifferentiableOnDomain: boolean;

	/** The variable analyzed */
	readonly variable: string;

	/** Step-by-step analysis process for pedagogy */
	readonly steps?: readonly DifferentiabilityStep[];
}

// =============================================================================
// Options
// =============================================================================

/**
 * Options for differentiability analysis.
 */
export interface DifferentiabilityOptions {
	/** Verbosity level for step recording (default: 'summarized') */
	readonly verbosity?: Verbosity;

	/**
	 * Standard interval to search for periodic non-differentiable points.
	 * Default: { min: -2pi, max: 2pi }
	 */
	readonly standardInterval?: { min: number; max: number };

	/**
	 * Maximum number of periodic points to enumerate.
	 * Default: 10
	 */
	readonly maxPeriodicPoints?: number;

	/**
	 * Whether to compute derivative limits at candidate points.
	 * Setting to false will only identify non-differentiable points
	 * without computing the actual derivative limits.
	 * Default: true
	 */
	readonly computeDerivativeLimits?: boolean;

	/**
	 * Whether to include continuity analysis.
	 * If true, discontinuities will be detected and marked as non-differentiable.
	 * Default: true
	 */
	readonly includeContinuityAnalysis?: boolean;

	/** Timeout in milliseconds (default: 5000) */
	readonly timeout?: number;
}
