/**
 * GeoValue comparison.
 *
 * Delegates to MathAST's existing comparison functions:
 * - compareNumericNodes: exact first (a-b, evaluate exact, check zero), then decimal
 * - isZeroExpression: normalize and check empty numerator
 */

import type { GeoValue } from '../types/geo-value';
import { isExact } from '../types/geo-value';
import { geoToNumber } from './to-number';
import { compareNumericNodes } from '$lib/mathAST/eval';
import { isZeroExpression } from '$lib/mathAST/normal';

const RELATIVE_TOLERANCE = 1e-12;
const ABSOLUTE_ZERO_TOLERANCE = 1e-15;

/**
 * Compare two GeoValues for equality.
 * Exact values: uses MathAST compareNumericNodes (exact algebra then decimal fallback).
 * Numeric or mixed: relative tolerance.
 */
export function geoEqual(a: GeoValue, b: GeoValue): boolean {
	if (isExact(a) && isExact(b)) {
		return compareNumericNodes(a.node, b.node) === 0;
	}
	return geoApproxEqual(geoToNumber(a), geoToNumber(b));
}

/**
 * Check if a GeoValue is zero.
 * Exact: uses MathAST isZeroExpression (normalize, check empty numerator).
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
 * For exact values: uses MathAST compareNumericNodes.
 */
export function geoLessThan(a: GeoValue, b: GeoValue): boolean {
	if (isExact(a) && isExact(b)) {
		return compareNumericNodes(a.node, b.node) === -1;
	}
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
