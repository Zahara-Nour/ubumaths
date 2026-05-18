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
import { add, subtract, multiply, divide, fraction, sqrt, opposite } from '$lib/mathAST';
import { numericNode } from '$lib/mathAST/common/numeric';
import { evaluate } from '$lib/mathAST/eval';
import type { MathNode } from '$lib/mathAST/types';

/**
 * Simplify a MathNode via exact evaluation.
 * Returns the simplified node.
 */
export function simplifyExact(node: MathNode): MathNode {
	const result = evaluate(node, { mode: 'exact' });
	if (result.status === 'value') return result.node;
	return node; // fallback: return unsimplified
}

/**
 * Apply a binary operation.
 *
 * - exact ⊕ exact     → exact
 * - exact ⊕ integer   → exact (the integer is lifted to a NumberNode)
 * - integer ⊕ exact   → exact (idem)
 * - anything else     → numeric
 *
 * The integer-lifting promotes exactness through `point(0, 0)` + `point(2*sqrt(3), 0)` :
 * the DSL emits `numeric(0)` for the literal `0`, but `geoAdd(numeric(0), exact(sqrt(3)))`
 * should still propagate exactness for the derived midpoint, rotation, etc.
 * Non-integer numerics are not lifted because converting a float to a NumberNode
 * can produce a 17-digit literal that defeats `simplifyExact` (cf. `geoFromNumber`).
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
	if (isExact(a) && !isExact(b) && Number.isInteger(b.value)) {
		return exact(simplifyExact(exactOp(a.node, numericNode(b.value))));
	}
	if (isExact(b) && !isExact(a) && Number.isInteger(a.value)) {
		return exact(simplifyExact(exactOp(numericNode(a.value), b.node)));
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
	if (isExact(a) && !isExact(b) && Number.isInteger(b.value)) {
		return exact(simplifyExact(divide(a.node, numericNode(b.value), 'fraction')));
	}
	if (isExact(b) && !isExact(a) && Number.isInteger(a.value)) {
		return exact(simplifyExact(divide(numericNode(a.value), b.node, 'fraction')));
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

/**
 * Create a GeoValue from a number.
 * Integers -> exact (safe for BigInt arithmetic).
 * Non-integers -> numeric (avoids 17-digit MathNode explosion).
 *
 * For exact fractions: use geoFromFraction(1, 2).
 * For exact irrationals: use exact(sqrt(number(2))), exact(piConstant()).
 */
export function geoFromNumber(n: number): GeoValue {
	if (Number.isInteger(n)) {
		return exact(numericNode(n));
	}
	return numeric(n);
}

/**
 * Create an exact GeoValue from a fraction num/den.
 * Both arguments should be integers or simple decimals.
 */
export function geoFromFraction(num: number, den: number): GeoValue {
	return exact(fraction(numericNode(num), numericNode(den)));
}
