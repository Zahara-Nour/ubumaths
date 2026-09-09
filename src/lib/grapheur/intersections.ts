/**
 * Intersections between plotted curves.
 *
 * The search itself is `findRoots` from mathAST — exact symbolic solving first,
 * numeric bisection as a fallback. This module only holds the grapheur's glue:
 * pairing the visible curves, keeping what falls inside the viewport, and
 * merging points that land on top of each other.
 *
 * It used to carry its own sweep-and-bisect implementation. That one could only
 * see a sign change, so a tangency was found by luck — when its abscissa
 * happened to fall on one of the 200 sample points — and missed otherwise.
 *
 * @module grapheur/intersections
 */

import type { Point, Viewport } from './types';
import type { AnalysisInput } from './analysis';
import { subtract } from '$lib/mathAST/factory';
import { compile } from '$lib/mathAST/eval/compile';
import { findRoots } from '$lib/mathAST/analysis/roots';

// =============================================================================
// Types
// =============================================================================

/** One intersection point, and the two curves that meet there. */
export interface IntersectionResult {
	readonly point: Point;
	readonly functionIds: readonly [string, string];
}

// =============================================================================
// Constants
// =============================================================================

/** Default distance below which two intersection points are considered one. */
const DEFAULT_DEDUP_TOLERANCE = 0.001;

// =============================================================================
// Core
// =============================================================================

/**
 * Find where two curves meet inside the viewport.
 *
 * Solves `f₁(x) − f₂(x) = 0`. A curve whose expression could not be compiled
 * carries no AST and yields no intersection.
 *
 * @param f1 - First curve
 * @param f2 - Second curve
 * @param viewport - Bounds; a point outside them is dropped, in x as in y
 * @returns The intersection points, ascending in x
 */
export function findIntersections(
	f1: AnalysisInput,
	f2: AnalysisInput,
	viewport: Viewport
): Point[] {
	if (!f1.ast || !f2.ast) return [];

	const difference = subtract(f1.ast.expression, f2.ast.expression);

	let compiledDifference;
	try {
		compiledDifference = compile(difference);
	} catch {
		return [];
	}

	const points: Point[] = [];

	for (const root of findRoots(difference, compiledDifference, 'x', viewport.xMin, viewport.xMax)) {
		const y = f1.ast.compiledFn({ x: root.x });
		if (!Number.isFinite(y)) continue;
		if (y < viewport.yMin || y > viewport.yMax) continue;

		points.push({ x: root.x, y });
	}

	return points;
}

/**
 * Find the intersections of every pair among the given curves.
 *
 * @param functions - The curves to cross, built by `toAnalysisInputs()`
 * @param viewport - Current viewport bounds
 * @returns One result per intersection found, unordered
 */
export function findAllIntersections(
	functions: readonly AnalysisInput[],
	viewport: Viewport
): IntersectionResult[] {
	const results: IntersectionResult[] = [];

	for (let i = 0; i < functions.length; i++) {
		for (let j = i + 1; j < functions.length; j++) {
			const f1 = functions[i];
			const f2 = functions[j];

			for (const point of findIntersections(f1, f2, viewport)) {
				results.push({ point, functionIds: [f1.id, f2.id] as const });
			}
		}
	}

	return results;
}

// =============================================================================
// Deduplication
// =============================================================================

/**
 * Drop intersection points that sit within `tolerance` of one already kept.
 *
 * Three curves meeting at one place produce three results for the same visual
 * point; only the first is kept.
 *
 * @param intersections - Results to filter
 * @param tolerance - Minimum distance between two distinct points
 * @returns The kept results, in their original order
 */
export function deduplicateIntersections(
	intersections: readonly IntersectionResult[],
	tolerance: number = DEFAULT_DEDUP_TOLERANCE
): IntersectionResult[] {
	const result: IntersectionResult[] = [];

	for (const intersection of intersections) {
		const isDuplicate = result.some(
			(existing) =>
				Math.abs(existing.point.x - intersection.point.x) < tolerance &&
				Math.abs(existing.point.y - intersection.point.y) < tolerance
		);

		if (!isDuplicate) result.push(intersection);
	}

	return result;
}
