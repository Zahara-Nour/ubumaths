/**
 * Precise Bounds via Closed Interval Method
 *
 * Bridges the domain/range-helpers critical point analysis
 * with the numtype inference system to provide exact bounds
 * for univariate expressions where interval arithmetic over-approximates.
 */

import {
	computeRangeWithCriticalPointsExact,
	computeRangeWithCriticalPoints
} from '$lib/mathAST/domain/range-helpers';
import { getBoundsFromDomain, domainFromBounds } from '$lib/mathAST/domain/builtins';
import type { Bounds } from '$lib/math/intervals/algebra';
import type { MathNode } from '../../types';
import type { ExactBounds } from '../types';

/**
 * Result of precise bounds computation.
 * Includes numeric Bounds and optionally exact symbolic ExactBounds.
 */
export interface PreciseBoundsResult {
	bounds: Bounds;
	exactBounds?: ExactBounds;
}

/**
 * Compute precise bounds for an expression using the closed interval method
 * (differentiation + critical point analysis + endpoint evaluation).
 *
 * Tries the exact solver first (symbolic bounds), then falls back to
 * numeric sampling if the solver can't handle the derivative.
 *
 * @returns Precise bounds (with optional exact symbolic bounds), or undefined if computation fails
 */
export function computePreciseBounds(
	expr: MathNode,
	variable: string,
	variableBounds: Bounds
): PreciseBoundsResult | undefined {
	// Finite bounds required (closed interval method)
	if (variableBounds.lower === null || variableBounds.upper === null) return undefined;

	try {
		const inputDomain = domainFromBounds(variableBounds);

		// Try exact method first (symbolic bounds)
		const exactResult = computeRangeWithCriticalPointsExact(expr, variable, inputDomain);
		if (
			exactResult &&
			exactResult.domain.kind !== 'empty' &&
			exactResult.domain.kind !== 'universal'
		) {
			const bounds = getBoundsFromDomain(exactResult.domain);
			if (bounds) {
				return {
					bounds,
					exactBounds: {
						lower: exactResult.lowerNode,
						lowerApproximate: exactResult.lowerApproximate,
						lowerInclusive: exactResult.lowerInclusive,
						upper: exactResult.upperNode,
						upperApproximate: exactResult.upperApproximate,
						upperInclusive: exactResult.upperInclusive
					}
				};
			}
		}

		// Fallback: exact + sampling combo
		const rangeDomain = computeRangeWithCriticalPoints(expr, variable, inputDomain);
		if (!rangeDomain || rangeDomain.kind === 'empty' || rangeDomain.kind === 'universal') {
			return undefined;
		}
		const bounds = getBoundsFromDomain(rangeDomain);
		return bounds ? { bounds } : undefined;
	} catch {
		return undefined;
	}
}
