/**
 * Zero Finding Helpers for Sign Analysis
 *
 * Functions for finding zeros (roots) of mathematical expressions
 * within a specified domain using the solve module.
 *
 * Zeros serve as partition points for sign analysis: the domain is split at
 * zeros into sub-intervals where the expression doesn't cross zero.
 * By the intermediate value theorem, on each such sub-interval (assuming
 * continuity), the expression has constant sign.
 *
 * **This is the critical dependency of the entire sign module.** If findZeros
 * misses a zero (because solve cannot handle the equation type), the sign
 * analysis will produce an interval that actually contains a sign change,
 * and sampling may silently "confirm" an incorrect sign. No warning is emitted.
 *
 * ## Exact vs approximate values
 *
 * Each zero is returned as a ZeroInfo with:
 * - `value: MathNode` — the **exact symbolic** representation (e.g. sqrt(2), π/3).
 *   This is used as interval bounds, preserving exactness throughout.
 * - `approximate: number` — a numeric approximation used **only** for sorting,
 *   deduplication (within tolerance), and domain membership checks.
 * - `exact: boolean` — whether the zero was found algebraically (true) or
 *   numerically (false).
 *
 * The distinction matters: interval bounds in the final SignAnalysisResult are
 * always the exact MathNode values, never floating-point approximations.
 *
 * @module mathAST/sign/helpers/zeros
 */

import type { MathNode, RelationNode } from '../../types';
import type { Domain } from '../../domain/types';
import type { ZeroInfo } from '../types';
import type { Solution, PeriodicSolutionFamily } from '../../solve/types';
import { solve } from '../../solve/solve';
import { equals, number, add, multiply, opposite } from '../../factory';
import { isRelation } from '../../guards';
import { containsValue } from '../../domain/algebra';
import { getBoundsFromDomain } from '$lib/math/intervals/algebra';
import { denormalize, normalize } from '../../normal';

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

		// Handle periodic solutions on bounded domains
		if (result.periodicSolutions && domain.kind === 'interval_set') {
			const bounds = getDomainBounds(domain);
			if (
				bounds &&
				bounds.lower !== null &&
				bounds.upper !== null &&
				isFinite(bounds.lower) &&
				isFinite(bounds.upper)
			) {
				return enumeratePeriodicZeros(result.periodicSolutions, bounds, domain);
			}
		}

		// Filter solutions within the domain (default non-periodic path)
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
// Periodic Zero Enumeration
// =============================================================================

/**
 * Enumerate all periodic zeros within bounded domain.
 *
 * For each base solution x₀ with period T, enumerates all values
 * x₀ + k*T that fall within the domain bounds.
 *
 * @param family - The periodic solution family from the solver
 * @param bounds - Numeric bounds of the domain
 * @param domain - The full domain for membership checks
 * @returns Array of ZeroInfo for all periodic zeros in the domain
 *
 * @internal
 */
function enumeratePeriodicZeros(
	family: PeriodicSolutionFamily,
	bounds: {
		lower: number | null;
		upper: number | null;
		lowerInclusive: boolean;
		upperInclusive: boolean;
	},
	domain: Domain
): ZeroInfo[] {
	const zeros: ZeroInfo[] = [];
	const { baseSolutions, period, periodNumeric } = family;

	if (periodNumeric <= 0 || !isFinite(periodNumeric)) return [];

	const lower = bounds.lower!;
	const upper = bounds.upper!;

	// Tolerance for floating-point boundary comparisons.
	// Math.PI + 2*Math.PI may not equal 3*Math.PI exactly.
	// Looser than the 1e-10 duplicate tolerance in the solver because
	// boundary comparisons involve accumulated floating-point errors from k*period.
	const eps = 1e-9;

	// Safety: limit the number of points to avoid runaway enumeration
	const maxPoints = 200;

	for (const baseSolution of baseSolutions) {
		const baseNumeric = baseSolution.approximate;
		if (baseNumeric === undefined) continue;

		// Slightly expand k range to catch boundary values
		const kMin = Math.ceil((lower - eps - baseNumeric) / periodNumeric);
		const kMax = Math.floor((upper + eps - baseNumeric) / periodNumeric);

		// Safety: prevent excessive iteration for very large domains or tiny periods
		if (kMax - kMin > 1000) continue;

		for (let k = kMin; k <= kMax && zeros.length < maxPoints; k++) {
			const numericValue = baseNumeric + k * periodNumeric;

			// Check if value is within bounds (with tolerance)
			if (numericValue < lower - eps || numericValue > upper + eps) continue;

			// Check inclusive/exclusive bounds
			const atLower = Math.abs(numericValue - lower) < eps;
			const atUpper = Math.abs(numericValue - upper) < eps;
			if (atLower && !bounds.lowerInclusive) continue;
			if (atUpper && !bounds.upperInclusive) continue;

			// For non-contiguous domains (interval unions), check membership
			if (!atLower && !atUpper && !isValueInDomain(numericValue, domain)) continue;

			// Build symbolic value
			const symbolicValue = buildPeriodicZeroSymbolic(baseSolution.value, k, period);

			zeros.push({
				value: symbolicValue,
				approximate: numericValue,
				exact: true
			});
		}
	}

	return zeros;
}

/**
 * Build symbolic MathNode for base + k * period.
 *
 * Optimizes common cases:
 * - k = 0: returns base directly
 * - k = 1: base + period
 * - k = -1: base - period
 * - general: base + k * period
 *
 * Then normalizes to get a clean symbolic form.
 */
function buildPeriodicZeroSymbolic(base: MathNode, k: number, period: MathNode): MathNode {
	if (k === 0) return base;

	let kTimesT: MathNode;
	if (k === 1) {
		kTimesT = period;
	} else if (k === -1) {
		kTimesT = opposite(period);
	} else if (k > 0) {
		kTimesT = multiply(number(k.toString()), period, 'implicit');
	} else {
		kTimesT = opposite(multiply(number((-k).toString()), period, 'implicit'));
	}

	const raw = add(base, kTimesT);

	// Normalize to simplify (e.g. 0 + 2π → 2π, π/2 + 2π → 5π/2)
	try {
		return denormalize(normalize(raw));
	} catch {
		return raw;
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
