/**
 * Numeric Sampling Helpers for Sign Determination
 *
 * **Fallback** for when algebraic sign analysis returns 'unknown' (typically
 * for sums and differences, where component signs don't determine the result).
 *
 * ## How it works
 *
 * 1. Generate sample points inside the interval (avoiding open endpoints)
 * 2. Substitute each point into the expression and evaluate numerically
 * 3. Determine sign of each sample (with tolerance 1e-10 for zero detection)
 * 4. If all non-zero samples agree → return that sign; otherwise → 'unknown'
 *
 * ## Why this is reliable (and when it isn't)
 *
 * This module is called on intervals that lie **between consecutive zeros**
 * of the expression (zeros were found in the previous step by the solve module).
 * By the **intermediate value theorem**, a continuous function that doesn't cross
 * zero on an interval has constant sign on that interval. Therefore, a single
 * correctly-evaluated sample would suffice in theory; we use 5 for robustness
 * against numeric edge cases.
 *
 * **Critical caveat:** this reasoning assumes that the solve module found **all**
 * zeros. If a zero was missed, the interval actually contains a sign change, and
 * sampling may "confirm" an incorrect sign if all sample points happen to fall on
 * the same side of the missed zero — with no warning. The reliability of sampling
 * (and of the entire sign module) is therefore entirely conditioned by the
 * completeness of solve.
 *
 * ## Continuity assumption (important limitation)
 *
 * The IVT guarantee only holds for **continuous** functions. Standard mathematical
 * expressions (polynomials, rational functions, exp, ln, sin, cos, sqrt, …) are
 * continuous on their domain of definition, and discontinuities caused by
 * non-definition (1/x at 0, ln at 0, tan at π/2+kπ) are handled by the domain
 * module which splits the real line at those points.
 *
 * However, functions with **jump discontinuities inside their domain** (floor,
 * ceiling, piecewise, …) could change sign between sample points without passing
 * through zero, leading to incorrect results. These are not currently supported.
 *
 * ## Sampling does NOT affect interval bounds
 *
 * This module only determines the `sign` field of an already-existing interval.
 * The interval bounds remain the exact symbolic MathNodes set by the zero-finding
 * step — sampling never creates, modifies, or approximates interval bounds.
 *
 * @module mathAST/sign/helpers/sampling
 */

import type { MathNode } from '../../types';
import type { Interval } from '$lib/math/intervals/types';
import type { Sign } from '../types';
import { evaluate } from '../../eval/evaluate';
import { substitute } from '../../eval/substitute';

// =============================================================================
// Constants
// =============================================================================

/** Default number of sample points */
const DEFAULT_SAMPLE_COUNT = 5;

/** Default tolerance for considering a value as zero */
const DEFAULT_TOLERANCE = 1e-10;

/** Maximum numeric value for sampling bounds */
const MAX_SAMPLE_BOUND = 1e6;

/** Minimum distance from bounds for sampling */
const BOUNDARY_MARGIN = 0.001;

// =============================================================================
// Main Sampling Function
// =============================================================================

/**
 * Options for numeric sampling.
 */
export interface SamplingOptions {
	/** Number of sample points (default: 5) */
	readonly sampleCount?: number;

	/** Tolerance for considering values as zero (default: 1e-10) */
	readonly tolerance?: number;
}

/**
 * Determine sign by numeric sampling (fallback when algebraic analysis fails).
 *
 * Called on intervals between consecutive zeros where the function is continuous.
 * By the IVT, the sign is constant on such intervals, so sampling is reliable.
 *
 * Strategy:
 * 1. Generate `sampleCount` (default 5) evenly-spaced points inside the interval
 * 2. Evaluate the expression at each point via substitute() + evaluate()
 * 3. Determine sign of each result (values < tolerance treated as zero)
 * 4. If all non-zero samples agree → return that sign
 * 5. If samples disagree → return 'unknown' (should not happen if all zeros
 *    were found and the function is continuous — indicates a missed zero or
 *    a discontinuous function)
 *
 * @param expr - The expression to sample
 * @param variable - The variable name
 * @param interval - The interval to sample on (bounds are symbolic, converted
 *                   to numeric for generating sample points)
 * @param options - Sampling options
 * @returns The determined sign
 */
export function sampleSignOnInterval(
	expr: MathNode,
	variable: string,
	interval: Interval,
	options?: SamplingOptions
): Sign {
	const sampleCount = options?.sampleCount ?? DEFAULT_SAMPLE_COUNT;
	const tolerance = options?.tolerance ?? DEFAULT_TOLERANCE;

	// Get sample points
	const points = getSamplePoints(interval, sampleCount);

	if (points.length === 0) {
		return 'unknown';
	}

	// Evaluate at each point
	const signs: Sign[] = [];

	for (const point of points) {
		try {
			const value = evaluateAtPoint(expr, variable, point);
			if (value !== null) {
				signs.push(signFromNumber(value, tolerance));
			}
		} catch {
			// If evaluation fails, skip this point
			continue;
		}
	}

	if (signs.length === 0) {
		return 'unknown';
	}

	// Check if all signs are the same
	return determineConsensusSign(signs);
}

// =============================================================================
// Sample Point Generation
// =============================================================================

/**
 * Get sample points within an interval (avoiding endpoints if open).
 *
 * @param interval - The interval to sample from
 * @param count - Number of sample points to generate
 * @returns Array of numeric sample points
 *
 * @example
 * // Get 5 sample points in ]0, 10[
 * const points = getSamplePoints(openInterval(0, 10), 5);
 * // Returns points like [1, 2.5, 5, 7.5, 9]
 */
export function getSamplePoints(interval: Interval, count: number): number[] {
	const lower = getNumericBound(interval.lower.value, 'lower');
	const upper = getNumericBound(interval.upper.value, 'upper');

	// Handle invalid bounds
	if (lower === null || upper === null) {
		return [];
	}

	// Handle infinite bounds with reasonable defaults
	const effectiveLower = lower === -Infinity ? -MAX_SAMPLE_BOUND : lower;
	const effectiveUpper = upper === Infinity ? MAX_SAMPLE_BOUND : upper;

	// Add margin for open endpoints
	let sampleLower = effectiveLower;
	let sampleUpper = effectiveUpper;

	if (interval.lower.type === 'open') {
		const range = effectiveUpper - effectiveLower;
		sampleLower = effectiveLower + Math.min(BOUNDARY_MARGIN, range * 0.01);
	}

	if (interval.upper.type === 'open') {
		const range = effectiveUpper - effectiveLower;
		sampleUpper = effectiveUpper - Math.min(BOUNDARY_MARGIN, range * 0.01);
	}

	// Check if interval is valid
	if (sampleLower >= sampleUpper) {
		// Degenerate interval - return midpoint if possible
		if (interval.lower.type === 'closed' && interval.upper.type === 'closed') {
			return [sampleLower];
		}
		return [];
	}

	// Generate evenly spaced sample points
	const points: number[] = [];
	const step = (sampleUpper - sampleLower) / (count + 1);

	for (let i = 1; i <= count; i++) {
		const point = sampleLower + i * step;
		points.push(point);
	}

	return points;
}

/**
 * Get a single representative sample point from an interval.
 *
 * @param interval - The interval to sample from
 * @returns A sample point, or null if interval is empty
 */
export function getSamplePoint(interval: Interval): number | null {
	const points = getSamplePoints(interval, 1);
	return points.length > 0 ? points[0] : null;
}

// =============================================================================
// Sign Determination
// =============================================================================

/**
 * Determine sign from a numeric value.
 *
 * @param value - The numeric value
 * @param tolerance - Tolerance for zero comparison
 * @returns The sign of the value
 *
 * @example
 * signFromNumber(5, 1e-10)   // 'positive'
 * signFromNumber(-3, 1e-10)  // 'negative'
 * signFromNumber(1e-15, 1e-10) // 'zero'
 */
export function signFromNumber(value: number, tolerance: number = DEFAULT_TOLERANCE): Sign {
	if (!Number.isFinite(value)) {
		return 'unknown';
	}

	if (Math.abs(value) < tolerance) {
		return 'zero';
	}

	return value > 0 ? 'positive' : 'negative';
}

/**
 * Determine consensus sign from multiple samples.
 * Returns the sign if all samples agree, 'unknown' otherwise.
 */
function determineConsensusSign(signs: readonly Sign[]): Sign {
	if (signs.length === 0) {
		return 'unknown';
	}

	const firstNonZero = signs.find((s) => s !== 'zero');

	if (firstNonZero === undefined) {
		// All samples are zero
		return 'zero';
	}

	// Check if all non-zero samples have the same sign
	for (const sign of signs) {
		if (sign === 'unknown') {
			return 'unknown';
		}
		if (sign !== 'zero' && sign !== firstNonZero) {
			// Sign change detected - shouldn't happen between zeros
			return 'unknown';
		}
	}

	return firstNonZero;
}

// =============================================================================
// Evaluation Helpers
// =============================================================================

/**
 * Evaluate an expression at a specific point.
 *
 * @param expr - The expression to evaluate
 * @param variable - The variable name
 * @param value - The value to substitute
 * @returns The numeric result, or null if evaluation fails
 */
function evaluateAtPoint(expr: MathNode, variable: string, value: number): number | null {
	try {
		// Substitute the value
		const substituted = substitute(expr, { [variable]: value });

		// Evaluate to numeric
		const result = evaluate(substituted, { mode: 'decimal' });

		// Extract numeric value
		if (typeof result.value === 'number' && Number.isFinite(result.value)) {
			return result.value;
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * Get numeric value from an endpoint, handling infinity.
 *
 * @param value - The endpoint MathNode
 * @param _bound - Whether this is a 'lower' or 'upper' bound (unused but kept for API consistency)
 * @returns The numeric value (possibly +/- Infinity), or null if cannot convert
 */
function getNumericBound(value: MathNode, _bound: 'lower' | 'upper'): number | null {
	// Handle infinity nodes
	if (value.type === 'infinity') {
		return value.sign === 'positive' ? Infinity : -Infinity;
	}

	// Handle number nodes
	if (value.type === 'number') {
		return parseFloat(value.value);
	}

	// Handle opposite nodes
	if (value.type === 'opposite' && value.operand.type === 'number') {
		return -parseFloat(value.operand.value);
	}

	// Handle math constants
	if (value.type === 'constant') {
		return value.constant === 'pi' ? Math.PI : Math.E;
	}

	// Try to evaluate symbolically
	try {
		const result = evaluate(value, { mode: 'decimal' });
		if (typeof result.value === 'number' && Number.isFinite(result.value)) {
			return result.value;
		}
	} catch {
		// Evaluation failed
	}

	// Cannot determine numeric value
	return null;
}

// =============================================================================
// Adaptive Sampling
// =============================================================================

/**
 * Perform adaptive sampling to get more reliable sign determination.
 * Unlike the basic version, places samples strategically:
 * - Near the lower bound (catches sign close to zeros/discontinuities)
 * - At the midpoint
 * - Near the upper bound
 * - Two intermediate points for extra reliability
 *
 * Same IVT-based reasoning as sampleSignOnInterval: between consecutive
 * zeros, a continuous function has constant sign, so all samples should agree.
 *
 * @param expr - The expression to sample
 * @param variable - The variable name
 * @param interval - The interval to sample on
 * @param tolerance - Tolerance for zero comparison
 * @returns The determined sign
 */
export function adaptiveSampleSign(
	expr: MathNode,
	variable: string,
	interval: Interval,
	tolerance: number = DEFAULT_TOLERANCE
): Sign {
	const bounds = getBoundsFromInterval(interval);
	if (bounds === null) {
		return 'unknown';
	}

	const { lower, upper } = bounds;

	// Generate adaptive sample points
	const points: number[] = [];

	// Sample near lower bound
	if (lower !== -Infinity) {
		const margin = interval.lower.type === 'open' ? BOUNDARY_MARGIN : 0;
		points.push(lower + margin + 0.001);
	} else {
		points.push(-1000);
	}

	// Sample at midpoint
	const mid =
		(lower === -Infinity ? -MAX_SAMPLE_BOUND : lower) +
		(upper === Infinity ? MAX_SAMPLE_BOUND : upper);
	points.push(mid / 2);

	// Sample near upper bound
	if (upper !== Infinity) {
		const margin = interval.upper.type === 'open' ? BOUNDARY_MARGIN : 0;
		points.push(upper - margin - 0.001);
	} else {
		points.push(1000);
	}

	// Add a few more points for reliability
	points.push((points[0] + points[1]) / 2);
	points.push((points[1] + points[2]) / 2);

	// Evaluate at each point
	const signs: Sign[] = [];
	for (const point of points) {
		try {
			const value = evaluateAtPoint(expr, variable, point);
			if (value !== null) {
				signs.push(signFromNumber(value, tolerance));
			}
		} catch {
			continue;
		}
	}

	return determineConsensusSign(signs);
}

/**
 * Get numeric bounds from an interval.
 */
function getBoundsFromInterval(interval: Interval): { lower: number; upper: number } | null {
	const lower = getNumericBound(interval.lower.value, 'lower');
	const upper = getNumericBound(interval.upper.value, 'upper');

	if (lower === null || upper === null) {
		return null;
	}

	return { lower, upper };
}
