/**
 * Zero Finding Helpers for Sign Analysis
 *
 * Functions for finding zeros (roots) of mathematical expressions
 * within a specified domain using the solve module.
 *
 * @module mathAST/sign/helpers/zeros
 */

import type { MathNode, RelationNode } from '../../types';
import type { Domain } from '../../domain/types';
import type { ZeroInfo } from '../types';
import type { Solution } from '../../solve/types';
import { solve } from '../../solve/solve';
import { equals, number } from '../../factory';
import { isRelation } from '../../guards';
import { containsValue } from '$lib/math/intervals/algebra';
import { getBoundsFromDomain } from '$lib/math/intervals/algebra';

// =============================================================================
// Zero Finding
// =============================================================================

/**
 * Find zeros of an expression f(x) = 0 within a domain.
 * Uses the solve module to find roots and filters them based on the domain.
 *
 * @param expr - The expression to find zeros for
 * @param variable - The variable name (e.g., 'x')
 * @param domain - The domain to restrict zeros to
 * @returns Array of ZeroInfo objects for zeros within the domain
 *
 * @example
 * // Find zeros of x^2 - 4 in R
 * const zeros = findZeros(parse('x^2 - 4'), 'x', universalDomain());
 * // Returns zeros at -2 and 2
 */
export function findZeros(expr: MathNode, variable: string, domain: Domain): ZeroInfo[] {
	// Handle empty domain
	if (domain.kind === 'empty') {
		return [];
	}

	try {
		// Create equation expr = 0
		const equation: RelationNode = equals(expr, number('0'));

		// Validate that we created a valid relation
		if (!isRelation(equation)) {
			return [];
		}

		// Solve the equation
		const result = solve(equation, { variable });

		// Handle cases where solving failed or no solutions
		if (
			result.status === 'no-solution' ||
			result.status === 'no-real-solution' ||
			result.solutions.length === 0
		) {
			return [];
		}

		// Handle infinite solutions (e.g., 0 = 0)
		if (result.status === 'infinite') {
			// Expression is identically zero - no isolated zeros to report
			return [];
		}

		// Filter solutions within the domain
		const zerosInDomain = filterSolutionsInDomain(result.solutions, domain);

		return zerosInDomain;
	} catch {
		// If solving fails (unsupported equation type, etc.), return empty
		return [];
	}
}

/**
 * Filter solutions to only those within the specified domain.
 *
 * @param solutions - Solutions from the solve module
 * @param domain - Domain to filter by
 * @returns Array of ZeroInfo for solutions within the domain
 *
 * @internal
 */
function filterSolutionsInDomain(solutions: readonly Solution[], domain: Domain): ZeroInfo[] {
	const result: ZeroInfo[] = [];

	for (const solution of solutions) {
		// Get numeric value for domain checking
		const numericValue = solution.approximate;

		// If we have a numeric approximation, check if it's in the domain
		if (numericValue !== undefined) {
			const inDomain = isValueInDomain(numericValue, domain);
			if (!inDomain) {
				continue;
			}
		}

		// Convert to ZeroInfo
		result.push({
			value: solution.value,
			approximate: numericValue,
			exact: solution.exact
		});
	}

	return result;
}

/**
 * Check if a numeric value is within a domain.
 *
 * @param value - The numeric value to check
 * @param domain - The domain to check against
 * @returns True if the value is in the domain
 *
 * @internal
 */
function isValueInDomain(value: number, domain: Domain): boolean {
	switch (domain.kind) {
		case 'empty':
			return false;

		case 'universal':
			return true;

		case 'interval_set':
			return containsValue(domain, value);

		case 'condition_domain':
			// For condition domains, we'd need to evaluate conditions
			// For now, conservatively return true
			return true;

		case 'periodic_exclusion':
			// For periodic exclusions, we'd need to check against the exclusion pattern
			// For now, conservatively return true
			return true;

		default:
			return true;
	}
}

// =============================================================================
// Zero Sorting
// =============================================================================

/**
 * Sort zeros by their numeric value for interval splitting.
 * Zeros without numeric approximations are placed at the end.
 *
 * @param zeros - Array of ZeroInfo objects to sort
 * @returns New sorted array (original is not modified)
 *
 * @example
 * const sorted = sortZerosByValue(zeros);
 * // Zeros are now in ascending order by approximate value
 */
export function sortZerosByValue(zeros: readonly ZeroInfo[]): ZeroInfo[] {
	return [...zeros].sort((a, b) => {
		// Handle missing approximations - put at end
		if (a.approximate === undefined && b.approximate === undefined) {
			return 0;
		}
		if (a.approximate === undefined) {
			return 1;
		}
		if (b.approximate === undefined) {
			return -1;
		}

		// Sort by numeric value
		return a.approximate - b.approximate;
	});
}

// =============================================================================
// Zero Utilities
// =============================================================================

/**
 * Get unique zeros, removing duplicates based on approximate value.
 * Uses a tolerance for comparing approximate values.
 *
 * @param zeros - Array of ZeroInfo objects
 * @param tolerance - Tolerance for considering values equal (default: 1e-10)
 * @returns Array with duplicate zeros removed
 *
 * @example
 * const unique = getUniqueZeros(zeros, 1e-8);
 */
export function getUniqueZeros(zeros: readonly ZeroInfo[], tolerance: number = 1e-10): ZeroInfo[] {
	if (zeros.length === 0) {
		return [];
	}

	const result: ZeroInfo[] = [];

	for (const zero of zeros) {
		// Check if we already have a zero with similar value
		const isDuplicate = result.some((existing) => {
			if (existing.approximate === undefined || zero.approximate === undefined) {
				// Can't compare without approximations - assume different
				return false;
			}
			return Math.abs(existing.approximate - zero.approximate) < tolerance;
		});

		if (!isDuplicate) {
			result.push(zero);
		}
	}

	return result;
}

/**
 * Get zeros that fall within an interval.
 *
 * @param zeros - Array of ZeroInfo objects
 * @param lowerBound - Lower bound (null for -infinity)
 * @param upperBound - Upper bound (null for +infinity)
 * @param lowerInclusive - Whether lower bound is inclusive
 * @param upperInclusive - Whether upper bound is inclusive
 * @returns Zeros within the interval
 *
 * @example
 * const inInterval = getZerosInInterval(zeros, 0, 10, false, true);
 * // Gets zeros in (0, 10]
 */
export function getZerosInInterval(
	zeros: readonly ZeroInfo[],
	lowerBound: number | null,
	upperBound: number | null,
	lowerInclusive: boolean = true,
	upperInclusive: boolean = true
): ZeroInfo[] {
	return zeros.filter((zero) => {
		if (zero.approximate === undefined) {
			// Can't determine - conservatively include
			return true;
		}

		const value = zero.approximate;

		// Check lower bound
		if (lowerBound !== null) {
			if (lowerInclusive) {
				if (value < lowerBound) return false;
			} else {
				if (value <= lowerBound) return false;
			}
		}

		// Check upper bound
		if (upperBound !== null) {
			if (upperInclusive) {
				if (value > upperBound) return false;
			} else {
				if (value >= upperBound) return false;
			}
		}

		return true;
	});
}

/**
 * Get numeric bounds from a domain for zero filtering.
 *
 * @param domain - The domain to extract bounds from
 * @returns Object with lower and upper bounds, or null if unbounded
 *
 * @internal
 */
export function getDomainBounds(domain: Domain): {
	lower: number | null;
	upper: number | null;
	lowerInclusive: boolean;
	upperInclusive: boolean;
} | null {
	if (domain.kind === 'empty') {
		return null;
	}

	if (domain.kind === 'universal') {
		return { lower: null, upper: null, lowerInclusive: false, upperInclusive: false };
	}

	if (domain.kind === 'interval_set') {
		return getBoundsFromDomain(domain);
	}

	// For other domain types, return unbounded
	return { lower: null, upper: null, lowerInclusive: false, upperInclusive: false };
}
