/**
 * GeoValue comparison - exact first, then tolerance.
 *
 * For exact values: normalize both and compare hashes (zero error).
 * For numeric values: relative tolerance comparison.
 */

import type { GeoValue } from '../types/geo-value';
import { isExact } from '../types/geo-value';
import { geoToNumber } from './to-number';
import { normalize } from '$lib/mathAST/normal';
import { subtract } from '$lib/mathAST';

const RELATIVE_TOLERANCE = 1e-12;
const ABSOLUTE_ZERO_TOLERANCE = 1e-15;

/**
 * Compare two GeoValues for equality.
 * Exact values: normalize(a - b) and check if zero (algebraic equivalence).
 * Numeric or mixed: fall back to relative tolerance.
 */
export function geoEqual(a: GeoValue, b: GeoValue): boolean {
	if (isExact(a) && isExact(b)) {
		// Normalize a-b; if the result is zero they are algebraically equal
		// (handles e.g. 2+3 == 5, sqrt(8) == 2*sqrt(2))
		const diff = subtract(a.node, b.node);
		const normalForm = normalize(diff);
		return normalForm.numerator.length === 0;
	}

	// Numeric or mixed: compare as floats with tolerance
	return geoApproxEqual(geoToNumber(a), geoToNumber(b));
}

/**
 * Check if a GeoValue is zero.
 * Exact: normalize and check if numerator is empty.
 * Numeric: check absolute value below threshold.
 */
export function geoIsZero(a: GeoValue): boolean {
	if (isExact(a)) {
		const normalForm = normalize(a.node);
		return normalForm.numerator.length === 0;
	}
	return Math.abs(a.value) < ABSOLUTE_ZERO_TOLERANCE;
}

/**
 * Check if a < b (strict ordering via float comparison).
 * No tolerance: for ordering decisions, we want strict less-than.
 * Use geoEqual() separately if you need approximate equality.
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
