/**
 * Numeric Sampling Helpers for Sign Determination
 *
 * Functions for determining the sign of an expression on an interval
 * using numeric sampling as a fallback when algebraic analysis fails.
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
 * Strategy:
 * 1. Sample multiple points within the interval
 * 2. Evaluate the expression at each point
 * 3. If all samples have the same sign, return that sign
 * 4. If samples have different signs, return 'unknown' (shouldn't happen between zeros)
 *
 * @param expr - The expression to sample
 * @param variable - The variable name
 * @param interval - The interval to sample on
 * @param options - Sampling options
 * @returns The determined sign
 *
 * @example
 * // Sample sign of x^2 + 1 on [-10, 10]
 * const sign = sampleSignOnInterval(parse('x^2 + 1'), 'x', interval);
 * // Returns 'positive'
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

	// Handle greek pi
	if (value.type === 'greek' && value.letter === 'pi') {
		return Math.PI;
	}

	// Handle variable e
	if (value.type === 'variable' && value.name === 'e') {
		return Math.E;
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
 * Uses more samples near boundaries and at the midpoint.
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
