/**
 * Grapheur Sampler - Generate sample points for curve rendering
 *
 * This module handles the sampling of mathematical functions over a viewport
 * to produce point arrays suitable for SVG path rendering. It includes
 * discontinuity detection for handling asymptotes and domain errors.
 *
 * @module grapheur/sampler
 */

import type { Point, SampledCurve, Viewport } from './types';

// =============================================================================
// Constants
// =============================================================================

/**
 * Default number of sample points across the viewport.
 * 200 points provides a good balance between smoothness and performance.
 */
export const DEFAULT_NUM_POINTS = 200;

/**
 * Factor used to detect asymptotes.
 * If the change in y between consecutive points exceeds this factor
 * times the viewport height, it's considered an asymptote.
 */
const ASYMPTOTE_FACTOR = 2;

/**
 * Minimum viewport dimension to prevent division by zero or extreme sampling.
 */
const MIN_VIEWPORT_DIM = 1e-10;

// =============================================================================
// Asymptote Detection
// =============================================================================

/**
 * Detect if there's an asymptote between two consecutive points.
 *
 * An asymptote is detected when:
 * - Either y value is null (domain error)
 * - The change in y is greater than ASYMPTOTE_FACTOR * viewportHeight
 * - The y values have opposite signs and are both large (crossing asymptote)
 *
 * @param y1 - First y value (or null if undefined)
 * @param y2 - Second y value (or null if undefined)
 * @param viewportHeight - Height of the viewport in math units
 * @returns true if an asymptote is detected
 *
 * @example
 * ```typescript
 * // Domain error causes discontinuity
 * isAsymptote(null, 5, 10); // true
 *
 * // Large jump causes discontinuity
 * isAsymptote(1000, -1000, 10); // true
 *
 * // Normal variation, no discontinuity
 * isAsymptote(1, 2, 10); // false
 * ```
 */
export function isAsymptote(y1: number | null, y2: number | null, viewportHeight: number): boolean {
	// If either value is null (domain error), it's a discontinuity
	if (y1 === null || y2 === null) {
		return true;
	}

	// Ensure viewport height is reasonable
	const height = Math.max(viewportHeight, MIN_VIEWPORT_DIM);

	// Calculate the change in y
	const deltaY = Math.abs(y2 - y1);

	// Large jump relative to viewport height indicates asymptote
	if (deltaY > ASYMPTOTE_FACTOR * height) {
		return true;
	}

	// Check for sign change with large values (crossing a vertical asymptote)
	// This catches cases like 1/x where values go from +large to -large
	if (y1 * y2 < 0) {
		const absY1 = Math.abs(y1);
		const absY2 = Math.abs(y2);
		// If both values are more than half the viewport height and opposite signs
		if (absY1 > height / 2 && absY2 > height / 2) {
			return true;
		}
	}

	return false;
}

// =============================================================================
// Sampling
// =============================================================================

/**
 * Sample a function over a viewport to generate curve points.
 *
 * Evaluates the function at evenly-spaced x values across the viewport
 * and collects the resulting (x, y) points. Detects discontinuities
 * caused by domain errors or asymptotes.
 *
 * @param evaluator - Function that takes x and returns y (or null for undefined)
 * @param viewport - The mathematical viewport bounds
 * @param numPoints - Number of sample points (default: 200)
 * @returns SampledCurve with points and discontinuity indices
 *
 * @example
 * ```typescript
 * // Sample a parabola
 * const f = (x: number) => x * x;
 * const viewport = { xMin: -5, xMax: 5, yMin: 0, yMax: 25 };
 * const curve = sampleFunction(f, viewport);
 * // curve.points contains 200 points along y = x^2
 * // curve.discontinuityIndices is empty (no discontinuities)
 * ```
 *
 * @example
 * ```typescript
 * // Sample 1/x (has asymptote at x=0)
 * const f = (x: number) => x === 0 ? null : 1 / x;
 * const viewport = { xMin: -5, xMax: 5, yMin: -10, yMax: 10 };
 * const curve = sampleFunction(f, viewport);
 * // curve.discontinuityIndices contains index near x=0
 * ```
 */
export function sampleFunction(
	evaluator: (x: number) => number | null,
	viewport: Viewport,
	numPoints: number = DEFAULT_NUM_POINTS
): SampledCurve {
	// Validate inputs
	const n = Math.max(2, Math.floor(numPoints));
	const viewportWidth = viewport.xMax - viewport.xMin;
	const viewportHeight = viewport.yMax - viewport.yMin;

	// Handle degenerate viewport
	if (viewportWidth <= MIN_VIEWPORT_DIM) {
		return { points: [], discontinuityIndices: [] };
	}

	const step = viewportWidth / (n - 1);
	const points: Point[] = [];
	const discontinuityIndices: number[] = [];

	let prevY: number | null = null;

	for (let i = 0; i < n; i++) {
		const x = viewport.xMin + i * step;
		const y = evaluator(x);

		// Check for discontinuity (not for the first point)
		if (i > 0 && isAsymptote(prevY, y, viewportHeight)) {
			discontinuityIndices.push(points.length);
		}

		// Only add point if y is defined
		if (y !== null) {
			points.push({ x, y });
		}

		prevY = y;
	}

	return { points, discontinuityIndices };
}

/**
 * Sample a function with adaptive refinement near discontinuities.
 *
 * This function first samples at regular intervals, then adds extra
 * samples near detected discontinuities for better accuracy in
 * locating asymptotes.
 *
 * @param evaluator - Function that takes x and returns y (or null for undefined)
 * @param viewport - The mathematical viewport bounds
 * @param numPoints - Base number of sample points (default: 200)
 * @returns SampledCurve with points and discontinuity indices
 *
 * @example
 * ```typescript
 * // Sample tan(x) with adaptive refinement
 * const f = (x: number) => Math.tan(x);
 * const viewport = { xMin: -Math.PI, xMax: Math.PI, yMin: -10, yMax: 10 };
 * const curve = sampleFunctionAdaptive(f, viewport);
 * ```
 */
export function sampleFunctionAdaptive(
	evaluator: (x: number) => number | null,
	viewport: Viewport,
	numPoints: number = DEFAULT_NUM_POINTS
): SampledCurve {
	// First pass: regular sampling
	const initial = sampleFunction(evaluator, viewport, numPoints);

	// If no discontinuities, return as-is
	if (initial.discontinuityIndices.length === 0) {
		return initial;
	}

	// Second pass: refine near discontinuities
	const viewportWidth = viewport.xMax - viewport.xMin;
	const viewportHeight = viewport.yMax - viewport.yMin;
	const step = viewportWidth / (numPoints - 1);

	// Collect all x values with refinement
	const xValues = new Set<number>();

	// Add original sample points
	for (let i = 0; i < numPoints; i++) {
		xValues.add(viewport.xMin + i * step);
	}

	// Add refinement points near discontinuities
	const refinementStep = step / 10;
	for (const discIdx of initial.discontinuityIndices) {
		// Find the x value at this discontinuity
		if (discIdx > 0 && discIdx <= initial.points.length) {
			const point = initial.points[discIdx - 1];
			if (point) {
				// Add points around the discontinuity
				for (let j = -5; j <= 5; j++) {
					const x = point.x + j * refinementStep;
					if (x >= viewport.xMin && x <= viewport.xMax) {
						xValues.add(x);
					}
				}
			}
		}
	}

	// Sort x values and sample
	const sortedX = [...xValues].sort((a, b) => a - b);
	const points: Point[] = [];
	const discontinuityIndices: number[] = [];

	let prevY: number | null = null;

	for (const x of sortedX) {
		const y = evaluator(x);

		if (points.length > 0 && isAsymptote(prevY, y, viewportHeight)) {
			discontinuityIndices.push(points.length);
		}

		if (y !== null) {
			points.push({ x, y });
		}

		prevY = y;
	}

	return { points, discontinuityIndices };
}

/**
 * Generate sample points at specific x coordinates.
 *
 * Useful when you need control over exactly where samples are taken,
 * such as for critical points or user-specified values.
 *
 * @param evaluator - Function that takes x and returns y (or null for undefined)
 * @param xValues - Array of x values to sample at
 * @param viewportHeight - Height for asymptote detection
 * @returns SampledCurve with points and discontinuity indices
 *
 * @example
 * ```typescript
 * const f = (x: number) => Math.sin(x);
 * const xValues = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI];
 * const curve = sampleAtPoints(f, xValues, 2);
 * ```
 */
export function sampleAtPoints(
	evaluator: (x: number) => number | null,
	xValues: readonly number[],
	viewportHeight: number
): SampledCurve {
	if (xValues.length === 0) {
		return { points: [], discontinuityIndices: [] };
	}

	const points: Point[] = [];
	const discontinuityIndices: number[] = [];
	const height = Math.max(viewportHeight, MIN_VIEWPORT_DIM);

	let prevY: number | null = null;

	for (const x of xValues) {
		const y = evaluator(x);

		if (points.length > 0 && isAsymptote(prevY, y, height)) {
			discontinuityIndices.push(points.length);
		}

		if (y !== null) {
			points.push({ x, y });
		}

		prevY = y;
	}

	return { points, discontinuityIndices };
}
