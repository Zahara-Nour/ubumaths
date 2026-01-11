/**
 * Boundary Limits - Computing limits at domain boundaries
 *
 * This module computes limits of a function at the boundaries of its domain.
 * Boundaries include:
 * - Finite endpoints of intervals (with appropriate one-sided limits)
 * - Infinity (+/- infinity for unbounded domains)
 * - Excluded points (holes, vertical asymptotes)
 *
 * Uses the limits/ module for limit computation.
 *
 * @module mathAST/variations/boundary-limits
 */

import type { MathNode } from '../types';
import type { Domain, IntervalSet, Interval } from '../domain/types';
import type { BoundaryLimit, LimitValue } from './types';
import type { LimitResult, LimitDirection } from '../limits/types';
import { evaluateLimit } from '../limits';
import { infinity } from '../factory';
import { isNumber, isInfinity } from '../guards';
import {
	endpointToNumber,
	isPositiveInfinity,
	isNegativeInfinity
} from '$lib/math/intervals/endpoint';

// =============================================================================
// Types
// =============================================================================

/**
 * Information about a domain boundary point.
 */
export interface BoundaryPoint {
	/** The boundary point (may be a finite value or infinity) */
	readonly point: MathNode;
	/** Direction of approach for limit computation */
	readonly direction: LimitDirection;
	/** Whether this is an excluded point (hole/asymptote) */
	readonly isExcluded: boolean;
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Compute limits at all domain boundaries.
 *
 * For each boundary point (finite or infinite):
 * - Computes lim f(x) as x approaches the boundary
 * - Determines the appropriate direction (from left, from right, or both)
 * - Converts the limit result to a LimitValue
 *
 * @param expr - The expression f(x) to analyze
 * @param variable - The variable name (e.g., 'x')
 * @param domain - The domain of the function
 * @returns Array of BoundaryLimit for each boundary point
 *
 * @example
 * // For f(x) = 1/x on ]-inf, 0[ U ]0, +inf[:
 * // - lim(x -> -inf) = 0
 * // - lim(x -> 0-) = -inf
 * // - lim(x -> 0+) = +inf
 * // - lim(x -> +inf) = 0
 */
export function computeBoundaryLimits(
	expr: MathNode,
	variable: string,
	domain: Domain
): BoundaryLimit[] {
	const boundaries = getDomainBoundaries(domain);
	const limits: BoundaryLimit[] = [];

	for (const boundary of boundaries) {
		try {
			const result = evaluateLimit(expr, variable, boundary.point, boundary.direction);

			const limitValue = convertLimitResult(result);

			limits.push({
				point: boundary.point,
				limit: limitValue,
				approximate: getApproximateValue(result),
				direction: boundary.direction
			});
		} catch {
			// If limit computation fails, record as indeterminate
			limits.push({
				point: boundary.point,
				limit: 'indeterminate',
				direction: boundary.direction
			});
		}
	}

	return limits;
}

/**
 * Get all boundary points of a domain.
 *
 * Returns both finite boundaries and +/-infinity for unbounded domains.
 * For each boundary, specifies the direction of approach based on
 * whether the point is on the left or right edge of an interval.
 *
 * @param domain - The domain to analyze
 * @returns Array of boundary points with approach directions
 *
 * @example
 * // For domain ]0, +inf[:
 * // - { point: 0, direction: 'right' }  (approach from right)
 * // - { point: +inf, direction: 'left' } (approach from left)
 */
export function getDomainBoundaries(domain: Domain): BoundaryPoint[] {
	const boundaries: BoundaryPoint[] = [];

	switch (domain.kind) {
		case 'empty':
			// No boundaries for empty domain
			return [];

		case 'universal':
			// Universal domain has boundaries at +/- infinity
			boundaries.push({
				point: infinity('negative'),
				direction: 'right',
				isExcluded: false
			});
			boundaries.push({
				point: infinity('positive'),
				direction: 'left',
				isExcluded: false
			});
			return boundaries;

		case 'interval_set':
			return getIntervalSetBoundaries(domain);

		case 'condition_domain':
			// For condition domains, we need to analyze conditions
			// This is a complex case - return empty for now
			return [];

		case 'periodic_exclusion':
			// Periodic exclusions are infinite - return +/- infinity
			boundaries.push({
				point: infinity('negative'),
				direction: 'right',
				isExcluded: false
			});
			boundaries.push({
				point: infinity('positive'),
				direction: 'left',
				isExcluded: false
			});
			return boundaries;

		default:
			return [];
	}
}

/**
 * Convert a LimitResult to a LimitValue type.
 *
 * Maps the limit module's result format to the variations module's format.
 *
 * @param result - The LimitResult from evaluateLimit
 * @returns The corresponding LimitValue
 */
export function convertLimitResult(result: LimitResult): LimitValue {
	// Handle cases where limit doesn't exist or is unsupported
	if (result.status === 'does-not-exist' || result.status === 'unsupported') {
		return 'indeterminate';
	}

	// Handle indeterminate forms that couldn't be resolved
	if (result.status === 'indeterminate') {
		return 'indeterminate';
	}

	// Handle null value
	if (result.value === null) {
		return 'indeterminate';
	}

	// Handle infinite limits
	if (isInfinity(result.value)) {
		if (result.value.sign === 'positive') {
			return 'infinity';
		} else {
			return 'negative_infinity';
		}
	}

	// Return the MathNode value
	return result.value;
}

/**
 * Get a French description of a limit at a boundary.
 *
 * Formats the limit in mathematical notation with French conventions.
 *
 * @param limit - The boundary limit to describe
 * @param variable - The variable name
 * @returns French description string
 *
 * @example
 * // { point: 0, limit: 'infinity', direction: 'right' }
 * // => "lim_{x -> 0^+} f(x) = +infini"
 */
export function getLimitDescription(limit: BoundaryLimit, variable: string): string {
	const pointStr = formatPoint(limit.point);
	const directionStr = formatDirection(limit.direction);
	const limitStr = formatLimitValue(limit.limit);

	return `lim_{${variable} -> ${pointStr}${directionStr}} f(${variable}) = ${limitStr}`;
}

/**
 * Get a compact French description for display in variation tables.
 *
 * @param limit - The boundary limit
 * @returns Short description for table cells
 */
export function getCompactLimitDescription(limit: BoundaryLimit): string {
	return formatLimitValue(limit.limit);
}

/**
 * Check if a limit is finite (not infinite or indeterminate).
 *
 * @param limit - The limit value to check
 * @returns True if the limit is a finite value
 */
export function isFiniteLimit(limit: LimitValue): boolean {
	return limit !== 'infinity' && limit !== 'negative_infinity' && limit !== 'indeterminate';
}

/**
 * Check if a limit indicates a vertical asymptote.
 *
 * @param limit - The boundary limit to check
 * @returns True if the limit is +/- infinity (vertical asymptote)
 */
export function isVerticalAsymptote(limit: BoundaryLimit): boolean {
	return limit.limit === 'infinity' || limit.limit === 'negative_infinity';
}

/**
 * Check if a limit indicates a horizontal asymptote.
 *
 * @param limit - The boundary limit to check
 * @returns True if the limit is finite at infinity
 */
export function isHorizontalAsymptote(limit: BoundaryLimit): boolean {
	const point = limit.point;
	const isAtInfinity = isInfinity(point);
	return isAtInfinity && isFiniteLimit(limit.limit);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get boundaries for an interval set domain.
 */
function getIntervalSetBoundaries(domain: IntervalSet): BoundaryPoint[] {
	const boundaries: BoundaryPoint[] = [];
	const processedPoints = new Set<number>();

	for (const interval of domain.intervals) {
		// Process lower bound
		const lowerBoundary = processIntervalBound(interval, 'lower', processedPoints);
		if (lowerBoundary) {
			boundaries.push(lowerBoundary);
		}

		// Process upper bound
		const upperBoundary = processIntervalBound(interval, 'upper', processedPoints);
		if (upperBoundary) {
			boundaries.push(upperBoundary);
		}
	}

	// Add excluded points as boundaries (need both left and right limits)
	for (const excluded of domain.excludedPoints) {
		const numValue = endpointToNumber(excluded.value);
		if (Number.isFinite(numValue) && !processedPoints.has(numValue)) {
			processedPoints.add(numValue);

			// For excluded points, compute limits from both sides
			boundaries.push({
				point: excluded.value,
				direction: 'left',
				isExcluded: true
			});
			boundaries.push({
				point: excluded.value,
				direction: 'right',
				isExcluded: true
			});
		}
	}

	return boundaries;
}

/**
 * Process an interval bound and return the boundary point if appropriate.
 */
function processIntervalBound(
	interval: Interval,
	boundType: 'lower' | 'upper',
	processedPoints: Set<number>
): BoundaryPoint | null {
	const endpoint = boundType === 'lower' ? interval.lower : interval.upper;
	const value = endpoint.value;

	// Check for infinity
	if (isPositiveInfinity(value)) {
		// Upper bound at +infinity: approach from left
		return {
			point: value,
			direction: 'left',
			isExcluded: false
		};
	}

	if (isNegativeInfinity(value)) {
		// Lower bound at -infinity: approach from right
		return {
			point: value,
			direction: 'right',
			isExcluded: false
		};
	}

	// Finite bound
	const numValue = endpointToNumber(value);
	if (Number.isFinite(numValue)) {
		// Skip if already processed
		if (processedPoints.has(numValue)) {
			return null;
		}
		processedPoints.add(numValue);

		// For lower bounds, approach from right (x -> a+)
		// For upper bounds, approach from left (x -> a-)
		const direction: LimitDirection = boundType === 'lower' ? 'right' : 'left';

		// Open endpoints are "excluded" in the sense that f may not be defined there
		const isExcluded = endpoint.type === 'open';

		return {
			point: value,
			direction,
			isExcluded
		};
	}

	return null;
}

/**
 * Get the approximate numeric value from a limit result.
 */
function getApproximateValue(result: LimitResult): number | undefined {
	if (result.value === null) {
		return undefined;
	}

	if (isInfinity(result.value)) {
		return result.value.sign === 'positive' ? Infinity : -Infinity;
	}

	if (isNumber(result.value)) {
		const val = parseFloat(result.value.value);
		return Number.isFinite(val) ? val : undefined;
	}

	return undefined;
}

/**
 * Format a point for display.
 */
function formatPoint(point: MathNode): string {
	if (isInfinity(point)) {
		return point.sign === 'positive' ? '+infini' : '-infini';
	}

	if (isNumber(point)) {
		return point.value;
	}

	// For complex expressions, return a placeholder
	return '...';
}

/**
 * Format the direction suffix.
 */
function formatDirection(direction: LimitDirection | undefined): string {
	if (direction === 'left') {
		return '^-';
	}
	if (direction === 'right') {
		return '^+';
	}
	return '';
}

/**
 * Format a limit value for display.
 */
function formatLimitValue(value: LimitValue): string {
	if (value === 'infinity') {
		return '+infini';
	}
	if (value === 'negative_infinity') {
		return '-infini';
	}
	if (value === 'indeterminate') {
		return 'indéterminé';
	}

	// MathNode value
	if (isNumber(value)) {
		return value.value;
	}

	if (isInfinity(value)) {
		return value.sign === 'positive' ? '+infini' : '-infini';
	}

	return '...';
}
