/**
 * Precise Bounds via Closed Interval Method
 *
 * Bridges the domain/range-helpers critical point analysis
 * with the numtype inference system to provide exact bounds
 * for univariate expressions where interval arithmetic over-approximates.
 *
 * Now works directly with IntervalDomain (no Bounds conversion round-trip).
 */

import {
	computeRangeWithCriticalPointsExact,
	computeRangeWithCriticalPoints
} from '$lib/mathAST/domain/range-helpers';
import type { MathNode } from '../../types';
import type { IntervalDomain } from '$lib/math/intervals/types';
import type { Domain } from '$lib/mathAST/domain/types';
import { intervalSet as domainIntervalSet } from '$lib/mathAST/domain/factory';
import { isPositiveInfinityEndpoint, isNegativeInfinityEndpoint } from '$lib/math/intervals';

/**
 * Compute precise bounds for an expression using the closed interval method
 * (differentiation + critical point analysis + endpoint evaluation).
 *
 * Tries the exact solver first (symbolic bounds), then falls back to
 * numeric sampling if the solver can't handle the derivative.
 *
 * @param expr - The expression to compute bounds for
 * @param variable - The name of the bounded variable
 * @param variableBounds - IntervalDomain with finite endpoints for the variable
 * @returns Precise IntervalDomain bounds, or undefined if computation fails
 */
export function computePreciseBounds(
	expr: MathNode,
	variable: string,
	variableBounds: IntervalDomain
): IntervalDomain | undefined {
	// Closed interval method requires finite bounds
	if (!hasFiniteEndpoints(variableBounds)) return undefined;

	// hasFiniteEndpoints guarantees an interval_set; re-tag it as a domain-level
	// Domain (adding an empty excludedPoints array) so it matches the Domain
	// parameter of the range helpers. This represents the SAME set.
	const domainBounds: Domain =
		variableBounds.kind === 'interval_set'
			? domainIntervalSet(variableBounds.intervals)
			: variableBounds;

	try {
		// Try exact method first (symbolic critical point analysis)
		const exactResult = computeRangeWithCriticalPointsExact(expr, variable, domainBounds);
		if (exactResult && isUsableResult(exactResult.domain)) {
			return exactResult.domain as IntervalDomain;
		}

		// Fallback: exact + sampling combo
		const rangeDomain = computeRangeWithCriticalPoints(expr, variable, domainBounds);
		if (rangeDomain && isUsableResult(rangeDomain)) {
			return rangeDomain as IntervalDomain;
		}

		return undefined;
	} catch {
		return undefined;
	}
}

/**
 * Check if an IntervalDomain has finite (non-infinite) endpoints.
 */
function hasFiniteEndpoints(domain: IntervalDomain): boolean {
	if (domain.kind !== 'interval_set') return false;
	if (domain.intervals.length === 0) return false;
	const lo = domain.intervals[0].lower;
	const hi = domain.intervals[domain.intervals.length - 1].upper;
	return !isNegativeInfinityEndpoint(lo.value) && !isPositiveInfinityEndpoint(hi.value);
}

/**
 * Check if a Domain result is usable (not empty, not universal, and is an interval set).
 */
function isUsableResult(domain: { kind: string }): boolean {
	return domain.kind === 'interval_set';
}
