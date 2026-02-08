/**
 * Precise Bounds via Closed Interval Method
 *
 * Bridges the domain/range-helpers critical point analysis
 * with the numtype inference system to provide exact bounds
 * for univariate expressions where interval arithmetic over-approximates.
 */

import { computeRangeWithCriticalPoints } from '$lib/mathAST/domain/range-helpers';
import { getBoundsFromDomain, domainFromBounds } from '$lib/mathAST/domain/builtins';
import type { Bounds } from '$lib/math/intervals/algebra';
import type { MathNode } from '../../types';

/**
 * Compute precise bounds for an expression using the closed interval method
 * (differentiation + critical point analysis + endpoint evaluation).
 *
 * Requires finite bounds on the variable (the method needs a closed interval).
 *
 * @returns Precise bounds, or undefined if computation fails or bounds are infinite
 */
export function computePreciseBounds(
	expr: MathNode,
	variable: string,
	variableBounds: Bounds
): Bounds | undefined {
	// Finite bounds required (closed interval method)
	if (variableBounds.lower === null || variableBounds.upper === null) return undefined;

	try {
		const inputDomain = domainFromBounds(variableBounds);
		const rangeDomain = computeRangeWithCriticalPoints(expr, variable, inputDomain);
		if (!rangeDomain || rangeDomain.kind === 'empty' || rangeDomain.kind === 'universal') {
			return undefined;
		}
		return getBoundsFromDomain(rangeDomain) ?? undefined;
	} catch {
		return undefined;
	}
}
