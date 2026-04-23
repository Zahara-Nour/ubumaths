/**
 * Arithmetic operations on GeoValue with exact propagation.
 *
 * Rule: exact op exact = exact, anything with numeric = numeric.
 * Exact operations build MathNode trees and simplify via MathAST evaluate(mode:'exact').
 */

import type { GeoValue } from '../types/geo-value';
import { exact, numeric, isExact } from '../types/geo-value';
import { geoToNumber } from './to-number';
import { geoIsZero } from './compare';
import { number, add, subtract, multiply, divide, fraction, sqrt, opposite } from '$lib/mathAST';
import { evaluate } from '$lib/mathAST/eval';
import type { MathNode } from '$lib/mathAST/types';

/**
 * Simplify a MathNode via exact evaluation.
 * Returns the simplified node.
 */
function simplifyExact(node: MathNode): MathNode {
	const result = evaluate(node, { mode: 'exact' });
	if (result.status === 'value') return result.node;
	return node; // fallback: return unsimplified
}

/**
 * Apply a binary operation.
 * If both operands are exact, build MathNode tree and simplify.
 * Otherwise, compute numerically.
 */
function binaryOp(
	a: GeoValue,
	b: GeoValue,
	exactOp: (an: MathNode, bn: MathNode) => MathNode,
	numericOp: (an: number, bn: number) => number
): GeoValue {
	if (isExact(a) && isExact(b)) {
		return exact(simplifyExact(exactOp(a.node, b.node)));
	}
	return numeric(numericOp(geoToNumber(a), geoToNumber(b)));
}

export function geoAdd(a: GeoValue, b: GeoValue): GeoValue {
	return binaryOp(
		a,
		b,
		(an, bn) => add(an, bn),
		(an, bn) => an + bn
	);
}

export function geoSub(a: GeoValue, b: GeoValue): GeoValue {
	return binaryOp(
		a,
		b,
		(an, bn) => subtract(an, bn),
		(an, bn) => an - bn
	);
}

export function geoMul(a: GeoValue, b: GeoValue): GeoValue {
	return binaryOp(
		a,
		b,
		(an, bn) => multiply(an, bn, 'dot'),
		(an, bn) => an * bn
	);
}

export function geoDiv(a: GeoValue, b: GeoValue): GeoValue | null {
	if (geoIsZero(b)) return null;

	if (isExact(a) && isExact(b)) {
		return exact(simplifyExact(divide(a.node, b.node, 'fraction')));
	}
	return numeric(geoToNumber(a) / geoToNumber(b));
}

/** Square root. Returns null for negative inputs (undefined in real geometry). */
export function geoSqrt(a: GeoValue): GeoValue | null {
	if (isExact(a)) {
		// Guard: check via float that the value is non-negative before building sqrt node.
		// Prevents constructing sqrt(negative) MathNode which would propagate silently.
		const approx = geoToNumber(a);
		if (approx < -1e-12) return null;
		return exact(simplifyExact(sqrt(a.node)));
	}
	const val = Math.sqrt(a.value);
	if (!Number.isFinite(val)) return null;
	return numeric(val);
}

export function geoOpposite(a: GeoValue): GeoValue {
	if (isExact(a)) {
		return exact(simplifyExact(opposite(a.node)));
	}
	return numeric(-a.value);
}

/** Create an exact GeoValue from a number. */
export function geoFromNumber(n: number): GeoValue {
	return exact(number(n));
}

/** Create an exact GeoValue from a fraction num/den. */
export function geoFromFraction(num: number, den: number): GeoValue {
	return exact(fraction(number(num), number(den)));
}
