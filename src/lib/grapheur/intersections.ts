/**
 * Intersection Detection for Grapheur
 *
 * Finds intersection points between function curves using
 * numerical root-finding. Uses sign-change detection followed
 * by bisection refinement.
 *
 * @module grapheur/intersections
 */

import type { Point, Viewport } from './types';

// =============================================================================
// Constants
// =============================================================================

/** Maximum iterations for bisection refinement */
const MAX_ITERATIONS = 50;

/** Tolerance for bisection convergence */
const TOLERANCE = 1e-10;

/** Default number of samples for initial sweep */
const DEFAULT_SAMPLES = 200;

// =============================================================================
// Core Algorithm
// =============================================================================

/**
 * Find intersection points between two functions.
 *
 * Algorithm:
 * 1. Sample the difference function d(x) = f1(x) - f2(x)
 * 2. Detect sign changes (potential intersection points)
 * 3. Refine each using bisection method
 *
 * @param f1 - First function evaluator
 * @param f2 - Second function evaluator
 * @param viewport - Current viewport bounds
 * @param numSamples - Number of samples for initial sweep
 * @returns Array of intersection points
 *
 * @example
 * ```typescript
 * const f1 = (x) => x * x;  // y = x²
 * const f2 = (x) => x;       // y = x
 * const viewport = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };
 * const intersections = findIntersections(f1, f2, viewport);
 * // Returns approximately [(0, 0), (1, 1)]
 * ```
 */
export function findIntersections(
	f1: (x: number) => number | null,
	f2: (x: number) => number | null,
	viewport: Viewport,
	numSamples: number = DEFAULT_SAMPLES
): Point[] {
	const intersections: Point[] = [];
	const step = (viewport.xMax - viewport.xMin) / numSamples;

	let prevX = viewport.xMin;
	let prevDiff = getDiff(f1, f2, prevX);

	for (let i = 1; i <= numSamples; i++) {
		const x = viewport.xMin + i * step;
		const diff = getDiff(f1, f2, x);

		// Sign change indicates potential intersection
		if (prevDiff !== null && diff !== null && prevDiff * diff < 0) {
			const intersection = bisectIntersection(f1, f2, prevX, x);
			if (intersection) {
				// Only include if within viewport
				if (
					intersection.y >= viewport.yMin &&
					intersection.y <= viewport.yMax &&
					intersection.x >= viewport.xMin &&
					intersection.x <= viewport.xMax
				) {
					intersections.push(intersection);
				}
			}
		}

		// Check for near-zero (exact or very close intersection)
		if (diff !== null && Math.abs(diff) < TOLERANCE) {
			const y = f1(x);
			if (
				y !== null &&
				y >= viewport.yMin &&
				y <= viewport.yMax &&
				x >= viewport.xMin &&
				x <= viewport.xMax
			) {
				// Avoid duplicates
				if (!intersections.some((p) => Math.abs(p.x - x) < step && Math.abs(p.y - y) < TOLERANCE)) {
					intersections.push({ x, y });
				}
			}
		}

		prevX = x;
		prevDiff = diff;
	}

	return intersections;
}

/**
 * Compute the difference between two functions at x.
 * Returns null if either function is undefined at x.
 */
function getDiff(
	f1: (x: number) => number | null,
	f2: (x: number) => number | null,
	x: number
): number | null {
	const y1 = f1(x);
	const y2 = f2(x);
	if (y1 === null || y2 === null) return null;
	return y1 - y2;
}

/**
 * Refine an intersection using bisection method.
 *
 * @param f1 - First function
 * @param f2 - Second function
 * @param xLow - Lower bound (where sign is one way)
 * @param xHigh - Upper bound (where sign is opposite)
 * @returns The intersection point, or null if refinement fails
 */
function bisectIntersection(
	f1: (x: number) => number | null,
	f2: (x: number) => number | null,
	xLow: number,
	xHigh: number
): Point | null {
	for (let i = 0; i < MAX_ITERATIONS; i++) {
		const xMid = (xLow + xHigh) / 2;

		// Check convergence
		if (xHigh - xLow < TOLERANCE) {
			const y = f1(xMid);
			return y !== null ? { x: xMid, y } : null;
		}

		const diffLow = getDiff(f1, f2, xLow);
		const diffMid = getDiff(f1, f2, xMid);

		// Handle undefined values
		if (diffLow === null || diffMid === null) {
			return null;
		}

		// Standard bisection: narrow to the interval with sign change
		if (diffLow * diffMid < 0) {
			xHigh = xMid;
		} else {
			xLow = xMid;
		}
	}

	// Return best approximation
	const xFinal = (xLow + xHigh) / 2;
	const y = f1(xFinal);
	return y !== null ? { x: xFinal, y } : null;
}

// =============================================================================
// Multi-Function Intersection
// =============================================================================

/**
 * Result of finding intersection between two functions.
 */
export interface IntersectionResult {
	/** The intersection point */
	readonly point: Point;
	/** IDs of the two functions that intersect */
	readonly functionIds: readonly [string, string];
}

/**
 * Find all pairwise intersections between multiple functions.
 *
 * Iterates through all unique pairs and finds intersections.
 *
 * @param functions - Array of functions with their IDs and evaluators
 * @param viewport - Current viewport bounds
 * @returns Array of intersection results
 *
 * @example
 * ```typescript
 * const functions = [
 *   { id: 'a', evaluator: (x) => x * x },
 *   { id: 'b', evaluator: (x) => x },
 *   { id: 'c', evaluator: (x) => 2 - x }
 * ];
 * const intersections = findAllIntersections(functions, viewport);
 * // Returns intersections for pairs (a,b), (a,c), (b,c)
 * ```
 */
export function findAllIntersections(
	functions: readonly { id: string; evaluator: (x: number) => number | null }[],
	viewport: Viewport
): IntersectionResult[] {
	const results: IntersectionResult[] = [];

	// Iterate through all unique pairs
	for (let i = 0; i < functions.length; i++) {
		for (let j = i + 1; j < functions.length; j++) {
			const f1 = functions[i];
			const f2 = functions[j];

			const intersections = findIntersections(f1.evaluator, f2.evaluator, viewport);

			for (const point of intersections) {
				results.push({
					point,
					functionIds: [f1.id, f2.id] as const
				});
			}
		}
	}

	return results;
}

// =============================================================================
// Deduplication
// =============================================================================

/**
 * Remove duplicate intersection points that are too close together.
 *
 * @param intersections - Array of intersection results
 * @param tolerance - Minimum distance between distinct points
 * @returns Deduplicated array
 */
export function deduplicateIntersections(
	intersections: IntersectionResult[],
	tolerance: number = 0.001
): IntersectionResult[] {
	const result: IntersectionResult[] = [];

	for (const intersection of intersections) {
		const isDuplicate = result.some(
			(existing) =>
				Math.abs(existing.point.x - intersection.point.x) < tolerance &&
				Math.abs(existing.point.y - intersection.point.y) < tolerance
		);

		if (!isDuplicate) {
			result.push(intersection);
		}
	}

	return result;
}
