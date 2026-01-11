/**
 * Extrema - Finding and classifying local/global extrema
 *
 * This module identifies extrema (minima and maxima) by analyzing sign changes
 * of the derivative. At each critical point, the derivative's sign change pattern
 * determines if the point is a local minimum, maximum, or inflection point.
 *
 * Algorithm:
 * - For each critical point, examine adjacent monotonic intervals
 * - Sign change from - to +: local minimum (f decreases then increases)
 * - Sign change from + to -: local maximum (f increases then decreases)
 * - No sign change or same sign: not an extremum (inflection or saddle)
 *
 * Global extrema are determined by comparing all local extrema and boundary values.
 *
 * @module mathAST/variations/extrema
 */

import type { MathNode } from '../types';
import type { Domain, IntervalSet } from '../domain/types';
import type {
	ExtremumInfo,
	ExtremumType,
	CriticalPointInfo,
	MonotonicInterval,
	BoundaryLimit
} from './types';
import { evaluate } from '../eval';
import { substitute } from '../eval/substitute';
import { endpointToNumber } from '$lib/math/intervals/endpoint';
import { containsValue } from '$lib/math/intervals/algebra';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of classifying a critical point.
 */
export type ExtremumClassification = 'local_minimum' | 'local_maximum' | 'inflection' | null;

/**
 * Boundary value information for global extrema comparison.
 */
export interface BoundaryValue {
	/** The x-coordinate at the boundary */
	readonly x: MathNode;
	/** The y-value at the boundary */
	readonly y: number;
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Find all extrema based on sign changes of f'(x).
 *
 * Examines each critical point and its adjacent monotonic intervals to
 * determine if the point is an extremum (local min or max).
 *
 * @param expr - The original expression f(x)
 * @param variable - The variable name (e.g., 'x')
 * @param criticalPoints - Critical points found by findCriticalPoints
 * @param monotonicIntervals - Monotonic intervals from buildMonotonicIntervals
 * @param domain - The domain of the function
 * @returns Array of ExtremumInfo for all identified extrema
 *
 * @example
 * // For f(x) = x^2 with critical point at x=0:
 * // - Decreasing on ]-inf, 0[
 * // - Increasing on ]0, +inf[
 * // => Local minimum at x=0 (sign change - to +)
 */
export function findExtrema(
	expr: MathNode,
	variable: string,
	criticalPoints: readonly CriticalPointInfo[],
	monotonicIntervals: readonly MonotonicInterval[],
	domain: Domain
): ExtremumInfo[] {
	const extrema: ExtremumInfo[] = [];

	for (const criticalPoint of criticalPoints) {
		// Skip if the critical point is outside the domain
		if (!isPointInDomain(criticalPoint, domain)) {
			continue;
		}

		// Find adjacent intervals
		const { before, after } = findAdjacentIntervals(criticalPoint.x, monotonicIntervals);

		// Classify the extremum
		const classification = classifyExtremum(criticalPoint, before, after);

		// Only add if it's an actual extremum (not inflection or null)
		if (classification === 'local_minimum' || classification === 'local_maximum') {
			// Compute y-value if not already present
			const yValue = criticalPoint.y ?? computeYValue(expr, variable, criticalPoint.x);
			const yApprox = criticalPoint.yApproximate ?? computeYApproximate(yValue);

			extrema.push({
				x: criticalPoint.x,
				xApproximate: criticalPoint.xApproximate,
				y: yValue,
				yApproximate: yApprox,
				type: classification,
				exact: criticalPoint.exact
			});
		}
	}

	return extrema;
}

/**
 * Classify a critical point as local min, local max, or inflection.
 *
 * Based on the first derivative test:
 * - f' changes from - to +: local minimum
 * - f' changes from + to -: local maximum
 * - No sign change: inflection point (not an extremum)
 *
 * @param criticalPoint - The critical point to classify
 * @param beforeInterval - The monotonic interval immediately before the point
 * @param afterInterval - The monotonic interval immediately after the point
 * @returns The extremum type, or null if not an extremum
 */
export function classifyExtremum(
	criticalPoint: CriticalPointInfo,
	beforeInterval: MonotonicInterval | null,
	afterInterval: MonotonicInterval | null
): ExtremumClassification {
	// Need both intervals to determine extremum type
	if (!beforeInterval || !afterInterval) {
		return null;
	}

	const beforeMono = beforeInterval.monotonicity;
	const afterMono = afterInterval.monotonicity;

	// Handle unknown monotonicity
	if (beforeMono === 'unknown' || afterMono === 'unknown') {
		return null;
	}

	// Local minimum: decreasing before, increasing after (sign - to +)
	if (beforeMono === 'decreasing' && afterMono === 'increasing') {
		return 'local_minimum';
	}

	// Local maximum: increasing before, decreasing after (sign + to -)
	if (beforeMono === 'increasing' && afterMono === 'decreasing') {
		return 'local_maximum';
	}

	// Inflection point or constant transition: not an extremum
	// Examples:
	// - increasing -> increasing (no change)
	// - constant -> increasing (saddle-like)
	return 'inflection';
}

/**
 * Find adjacent intervals around a critical point.
 *
 * Searches through the monotonic intervals to find:
 * - The interval immediately to the left of the point
 * - The interval immediately to the right of the point
 *
 * @param x - The x-coordinate of the critical point
 * @param intervals - Array of monotonic intervals
 * @returns Object with before and after intervals (may be null)
 */
export function findAdjacentIntervals(
	x: MathNode,
	intervals: readonly MonotonicInterval[]
): { before: MonotonicInterval | null; after: MonotonicInterval | null } {
	const xNumeric = evaluateToNumber(x);

	if (xNumeric === null) {
		return { before: null, after: null };
	}

	let before: MonotonicInterval | null = null;
	let after: MonotonicInterval | null = null;

	for (const interval of intervals) {
		const lower = endpointToNumber(interval.interval.lower.value);
		const upper = endpointToNumber(interval.interval.upper.value);

		if (!Number.isFinite(lower) && !Number.isFinite(upper)) {
			continue;
		}

		// Check if this interval is immediately before x
		// Upper bound should be at or near x
		if (Number.isFinite(upper) && Math.abs(upper - xNumeric) < 1e-10) {
			before = interval;
		}

		// Check if this interval is immediately after x
		// Lower bound should be at or near x
		if (Number.isFinite(lower) && Math.abs(lower - xNumeric) < 1e-10) {
			after = interval;
		}
	}

	return { before, after };
}

/**
 * Determine global extrema from local extrema and boundary values.
 *
 * For bounded domains, the global extrema are among:
 * - All local extrema
 * - Values at finite boundary points
 *
 * This function upgrades local extrema to global when applicable and
 * adds global extrema at boundary points if they exceed local extrema.
 *
 * @param localExtrema - Array of local extrema found by findExtrema
 * @param expr - The original expression f(x)
 * @param variable - The variable name
 * @param domain - The domain of the function
 * @param boundaryLimits - Optional boundary limits for determining edge behavior
 * @returns Array of ExtremumInfo with global classifications added
 */
export function classifyGlobalExtrema(
	localExtrema: readonly ExtremumInfo[],
	expr: MathNode,
	variable: string,
	domain: Domain,
	boundaryLimits?: readonly BoundaryLimit[]
): ExtremumInfo[] {
	// Collect all y-values for comparison
	const boundaryValues = getBoundaryValues(expr, variable, domain, boundaryLimits);

	// Get y-values from local extrema
	const localMinima = localExtrema.filter(
		(e) => e.type === 'local_minimum' || e.type === 'global_minimum'
	);
	const localMaxima = localExtrema.filter(
		(e) => e.type === 'local_maximum' || e.type === 'global_maximum'
	);

	// Find global minimum
	let globalMinValue = Infinity;
	for (const min of localMinima) {
		if (min.yApproximate !== undefined && min.yApproximate < globalMinValue) {
			globalMinValue = min.yApproximate;
		}
	}
	for (const bv of boundaryValues) {
		if (bv.y < globalMinValue) {
			globalMinValue = bv.y;
		}
	}

	// Find global maximum
	let globalMaxValue = -Infinity;
	for (const max of localMaxima) {
		if (max.yApproximate !== undefined && max.yApproximate > globalMaxValue) {
			globalMaxValue = max.yApproximate;
		}
	}
	for (const bv of boundaryValues) {
		if (bv.y > globalMaxValue) {
			globalMaxValue = bv.y;
		}
	}

	// Build the result array with upgraded types
	const result: ExtremumInfo[] = [];

	for (const extremum of localExtrema) {
		const isGlobalMin =
			(extremum.type === 'local_minimum' || extremum.type === 'global_minimum') &&
			extremum.yApproximate !== undefined &&
			Math.abs(extremum.yApproximate - globalMinValue) < 1e-10;

		const isGlobalMax =
			(extremum.type === 'local_maximum' || extremum.type === 'global_maximum') &&
			extremum.yApproximate !== undefined &&
			Math.abs(extremum.yApproximate - globalMaxValue) < 1e-10;

		let newType = extremum.type;
		if (isGlobalMin) {
			newType = 'global_minimum';
		} else if (isGlobalMax) {
			newType = 'global_maximum';
		}

		result.push({
			...extremum,
			type: newType
		});
	}

	// Add boundary points as global extrema if they are the global min/max
	// and no local extremum matches
	const hasGlobalMinInLocal = result.some((e) => e.type === 'global_minimum');
	const hasGlobalMaxInLocal = result.some((e) => e.type === 'global_maximum');

	for (const bv of boundaryValues) {
		if (!hasGlobalMinInLocal && Math.abs(bv.y - globalMinValue) < 1e-10) {
			const yNode = computeYValue(expr, variable, bv.x);
			result.push({
				x: bv.x,
				xApproximate: evaluateToNumber(bv.x) ?? undefined,
				y: yNode,
				yApproximate: bv.y,
				type: 'global_minimum',
				exact: true
			});
		}

		if (!hasGlobalMaxInLocal && Math.abs(bv.y - globalMaxValue) < 1e-10) {
			const yNode = computeYValue(expr, variable, bv.x);
			result.push({
				x: bv.x,
				xApproximate: evaluateToNumber(bv.x) ?? undefined,
				y: yNode,
				yApproximate: bv.y,
				type: 'global_maximum',
				exact: true
			});
		}
	}

	return result;
}

/**
 * Check if a local extremum is also a global extremum.
 *
 * Compares the extremum's y-value against all other extrema and boundary values.
 *
 * @param extremum - The extremum to check
 * @param allExtrema - All identified extrema
 * @param boundaryValues - Values at domain boundaries
 * @returns True if the extremum is global
 */
export function isGlobalExtremum(
	extremum: ExtremumInfo,
	allExtrema: readonly ExtremumInfo[],
	boundaryValues: readonly BoundaryValue[]
): boolean {
	if (extremum.yApproximate === undefined) {
		return false;
	}

	const isMinimum = extremum.type === 'local_minimum' || extremum.type === 'global_minimum';
	const isMaximum = extremum.type === 'local_maximum' || extremum.type === 'global_maximum';

	if (isMinimum) {
		// Check if any other value is smaller
		for (const other of allExtrema) {
			if (other === extremum) continue;
			if (other.yApproximate !== undefined && other.yApproximate < extremum.yApproximate - 1e-10) {
				return false;
			}
		}
		for (const bv of boundaryValues) {
			if (bv.y < extremum.yApproximate - 1e-10) {
				return false;
			}
		}
		return true;
	}

	if (isMaximum) {
		// Check if any other value is larger
		for (const other of allExtrema) {
			if (other === extremum) continue;
			if (other.yApproximate !== undefined && other.yApproximate > extremum.yApproximate + 1e-10) {
				return false;
			}
		}
		for (const bv of boundaryValues) {
			if (bv.y > extremum.yApproximate + 1e-10) {
				return false;
			}
		}
		return true;
	}

	return false;
}

/**
 * Get French description of an extremum type.
 *
 * Used for pedagogical display in variation tables.
 *
 * @param type - The extremum type
 * @returns French description string
 */
export function getExtremumDescription(type: ExtremumType): string {
	switch (type) {
		case 'local_minimum':
			return 'minimum local';
		case 'local_maximum':
			return 'maximum local';
		case 'global_minimum':
			return 'minimum global';
		case 'global_maximum':
			return 'maximum global';
	}
}

/**
 * Get the short French label for an extremum type.
 *
 * @param type - The extremum type
 * @returns Short label for display in tables
 */
export function getExtremumLabel(type: ExtremumType): string {
	switch (type) {
		case 'local_minimum':
			return 'min.';
		case 'local_maximum':
			return 'max.';
		case 'global_minimum':
			return 'Min.';
		case 'global_maximum':
			return 'Max.';
	}
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a critical point is within the domain.
 */
function isPointInDomain(point: CriticalPointInfo, domain: Domain): boolean {
	if (domain.kind === 'empty') {
		return false;
	}
	if (domain.kind === 'universal') {
		return true;
	}

	if (point.xApproximate !== undefined) {
		if (domain.kind === 'interval_set') {
			return containsValue(domain, point.xApproximate);
		}
	}

	// For other domain types, assume the point is valid
	return true;
}

/**
 * Try to evaluate a MathNode to a number.
 */
function evaluateToNumber(node: MathNode): number | null {
	try {
		const result = evaluate(node, { mode: 'decimal' });
		if (typeof result.value === 'number' && Number.isFinite(result.value)) {
			return result.value;
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Compute f(x) at a given x value.
 */
function computeYValue(expr: MathNode, variable: string, x: MathNode): MathNode {
	try {
		const substituted = substitute(expr, { [variable]: x });
		const result = evaluate(substituted, { mode: 'exact' });
		return result.node;
	} catch {
		// Return the substituted expression if evaluation fails
		return substitute(expr, { [variable]: x });
	}
}

/**
 * Compute numeric approximation of a y-value.
 */
function computeYApproximate(y: MathNode): number | undefined {
	const result = evaluateToNumber(y);
	return result ?? undefined;
}

/**
 * Get finite boundary values from the domain for global extrema comparison.
 */
function getBoundaryValues(
	expr: MathNode,
	variable: string,
	domain: Domain,
	boundaryLimits?: readonly BoundaryLimit[]
): BoundaryValue[] {
	const values: BoundaryValue[] = [];

	if (domain.kind === 'interval_set') {
		const intervalSet = domain as IntervalSet;

		for (const interval of intervalSet.intervals) {
			// Check lower bound if finite and closed
			const lower = endpointToNumber(interval.lower.value);
			if (Number.isFinite(lower) && interval.lower.type === 'closed') {
				const yValue = evaluateAtPoint(expr, variable, interval.lower.value);
				if (yValue !== null) {
					values.push({ x: interval.lower.value, y: yValue });
				}
			}

			// Check upper bound if finite and closed
			const upper = endpointToNumber(interval.upper.value);
			if (Number.isFinite(upper) && interval.upper.type === 'closed') {
				const yValue = evaluateAtPoint(expr, variable, interval.upper.value);
				if (yValue !== null) {
					values.push({ x: interval.upper.value, y: yValue });
				}
			}
		}
	}

	// Also consider boundary limits if they yield finite values
	if (boundaryLimits) {
		for (const bl of boundaryLimits) {
			if (bl.approximate !== undefined && Number.isFinite(bl.approximate)) {
				values.push({ x: bl.point, y: bl.approximate });
			}
		}
	}

	return values;
}

/**
 * Evaluate f(x) at a specific point and return the numeric value.
 */
function evaluateAtPoint(expr: MathNode, variable: string, x: MathNode): number | null {
	try {
		const substituted = substitute(expr, { [variable]: x });
		const result = evaluate(substituted, { mode: 'decimal' });
		if (typeof result.value === 'number' && Number.isFinite(result.value)) {
			return result.value;
		}
		return null;
	} catch {
		return null;
	}
}
