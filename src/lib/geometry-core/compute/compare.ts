/**
 * GeoValue comparison.
 *
 * - Equality and zero: exact via isZeroExpression (normalize, the definitive algebraic test)
 * - Ordering: float comparison (sufficient for rendering/layout)
 */

import type { GeoValue } from '../types/geo-value';
import { isExact } from '../types/geo-value';
import { geoToNumber } from './to-number';
import { subtract } from '$lib/mathAST';
import { isZeroExpression } from '$lib/mathAST/normal';

const RELATIVE_TOLERANCE = 1e-12;
const ABSOLUTE_ZERO_TOLERANCE = 1e-15;

/**
 * Compare two GeoValues for equality.
 * Exact values: normalize(a - b) and check if zero (definitive algebraic equivalence).
 * Numeric or mixed: relative tolerance.
 */
export function geoEqual(a: GeoValue, b: GeoValue): boolean {
	if (isExact(a) && isExact(b)) {
		return isZeroExpression(subtract(a.node, b.node));
	}
	return geoApproxEqual(geoToNumber(a), geoToNumber(b));
}

/**
 * Check if a GeoValue is zero.
 * Exact: normalize and check if zero (definitive algebraic test).
 * Numeric: absolute threshold.
 */
export function geoIsZero(a: GeoValue): boolean {
	if (isExact(a)) {
		return isZeroExpression(a.node);
	}
	return Math.abs(a.value) < ABSOLUTE_ZERO_TOLERANCE;
}

/**
 * Check if a < b (strict ordering via float comparison).
 */
export function geoLessThan(a: GeoValue, b: GeoValue): boolean {
	return geoToNumber(a) < geoToNumber(b);
}

/**
 * Approximate equality for two numbers using relative tolerance.
 */
export function geoApproxEqual(
	a: number,
	b: number,
	tolerance: number = RELATIVE_TOLERANCE
): boolean {
	const diff = Math.abs(a - b);
	if (diff === 0) return true;
	const magnitude = Math.max(Math.abs(a), Math.abs(b), ABSOLUTE_ZERO_TOLERANCE);
	return diff / magnitude < tolerance;
}
