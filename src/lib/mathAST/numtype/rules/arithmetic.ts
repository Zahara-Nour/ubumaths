/**
 * Type Inference Rules for Arithmetic Operations
 *
 * Handles type inference for:
 * - Addition (+)
 * - Subtraction (-)
 * - Multiplication (*)
 * - Division (/)
 * - Opposite (unary -)
 * - Positive (unary +)
 *
 * ## Interval Arithmetic (Bounds Propagation)
 *
 * For multiplication and division, we use the **four-corners theorem**:
 * since f(x,y) = x*y is bilinear (linear in x for fixed y, and vice versa),
 * its extrema over the rectangle [a,b]×[c,d] are always at the corners.
 * Therefore:
 *
 *   [a,b] × [c,d] = [min(ac,ad,bc,bd), max(ac,ad,bc,bd)]
 *
 * This gives the **exact** result for independent intervals (no over-approximation).
 *
 * The same principle applies to division (f(x,y) = x/y is bilinear in x
 * for fixed y) when the divisor doesn't contain zero.
 *
 * **Important**: this assumes operand intervals are independent. When the same
 * variable appears in both operands (e.g., x*x parsed as multiplication rather
 * than x^2), the four-corners method over-approximates. In practice, x*x is
 * parsed as x^2 and handled by computePowerBounds which is exact.
 *
 * ## Extended Arithmetic (Infinite Bounds)
 *
 * Bounds use `null` to represent ±∞ (lower=null means -∞, upper=null means +∞).
 * For the four-corners computation with possibly infinite endpoints, we use the
 * convention `0 × ±∞ = 0`. This is sound for set-theoretic interval products:
 * when x=0 is in interval A, {0·y : y ∈ B} = {0} regardless of B.
 *
 * **Note**: this differs from limit arithmetic where 0·∞ is indeterminate.
 * The normalizeExtended module (used for limits) correctly treats 0·∞ as
 * indeterminate, because there the value depends on the rate of approach.
 * Here we compute sets, not limits.
 */

import type { MathType, NumericType, ParityInfo, SignInfo } from '../types';
import { join } from '../algebra';
import type { Bounds } from '$lib/math/intervals/algebra';
import { signFromBounds } from './literals';

// =============================================================================
// Bounds Arithmetic Helpers
// =============================================================================

/**
 * Find min and max from a list of finite candidates, with OR tie-breaking for inclusivity.
 *
 * When multiple candidates share the same extreme value, the result is inclusive
 * if ANY of the tied candidates is inclusive. This is correct because the extreme
 * value is attained if at least one corner pair that produces it is inclusive.
 *
 * Used by divideBounds for finite-only corner products.
 * For extended arithmetic (with ±∞), multiplyBounds uses inline logic instead.
 */
function findExtremes(candidates: { value: number; inclusive: boolean }[]): {
	min: number;
	minInclusive: boolean;
	max: number;
	maxInclusive: boolean;
} {
	let min = Infinity;
	let minInclusive = false;
	let max = -Infinity;
	let maxInclusive = false;

	for (const c of candidates) {
		if (c.value < min) {
			min = c.value;
			minInclusive = c.inclusive;
		} else if (c.value === min && c.inclusive) {
			minInclusive = true;
		}

		if (c.value > max) {
			max = c.value;
			maxInclusive = c.inclusive;
		} else if (c.value === max && c.inclusive) {
			maxInclusive = true;
		}
	}

	return { min, minInclusive, max, maxInclusive };
}

/**
 * Add two bounds: [a,b] + [c,d] = [a+c, b+d].
 *
 * Addition is monotone in both arguments, so the extrema are simply
 * the sums of the corresponding endpoints. No four-corners needed.
 * Null endpoints (±∞) propagate: -∞ + finite = -∞, etc.
 */
function addBounds(a: Bounds, b: Bounds): Bounds {
	const lower = a.lower === null || b.lower === null ? null : a.lower + b.lower;
	const upper = a.upper === null || b.upper === null ? null : a.upper + b.upper;
	return {
		lower,
		upper,
		lowerInclusive: lower === null ? false : a.lowerInclusive && b.lowerInclusive,
		upperInclusive: upper === null ? false : a.upperInclusive && b.upperInclusive
	};
}

/**
 * Subtract two bounds: [a,b] - [c,d] = [a-d, b-c].
 *
 * To minimize: take the smallest left (a) minus the largest right (d).
 * To maximize: take the largest left (b) minus the smallest right (c).
 * Null endpoints propagate naturally.
 */
function subtractBounds(a: Bounds, b: Bounds): Bounds {
	const lower = a.lower === null || b.upper === null ? null : a.lower - b.upper;
	const upper = a.upper === null || b.lower === null ? null : a.upper - b.lower;
	return {
		lower,
		upper,
		lowerInclusive: lower === null ? false : a.lowerInclusive && b.upperInclusive,
		upperInclusive: upper === null ? false : a.upperInclusive && b.lowerInclusive
	};
}

/**
 * Extended multiplication for interval arithmetic.
 *
 * Uses the convention 0 × ±∞ = 0, which is sound for set-theoretic
 * interval products: {0·y : y ∈ B} = {0} for any interval B.
 *
 * This also avoids JS's `0 * Infinity = NaN` and `-0 * Infinity = NaN`.
 *
 * @param x - First factor (may be ±Infinity)
 * @param y - Second factor (may be ±Infinity)
 * @returns The product, using the 0×±∞=0 convention
 */
function extMul(x: number, y: number): number {
	if (x === 0 || y === 0) return 0;
	return x * y;
}

/**
 * Compute inclusivity for a corner product in extended interval multiplication.
 *
 * Rules:
 * - ±∞ × ±∞ → ±∞: never inclusive (infinity is never attained)
 * - ±∞ × nonzero → ±∞: never inclusive
 * - 0 × ±∞ → 0: inclusive if the zero endpoint is inclusive
 *   (because x=0 is in the interval, so 0·y = 0 for all y)
 * - finite × finite: inclusive only if both endpoints are inclusive
 *   (the product a·b is attained only if both a ∈ A and b ∈ B)
 */
function cornerInclusive(aVal: number, aIncl: boolean, bVal: number, bIncl: boolean): boolean {
	if (!isFinite(aVal) && !isFinite(bVal)) return false;
	if (!isFinite(aVal)) return bVal === 0 ? bIncl : false;
	if (!isFinite(bVal)) return aVal === 0 ? aIncl : false;
	return aIncl && bIncl;
}

/**
 * Multiply two bounds using the four-corners theorem with extended arithmetic.
 *
 * Since f(x,y) = x·y is bilinear, its extrema over [a,b]×[c,d] are at
 * the four corners (a,c), (a,d), (b,c), (b,d). The result is:
 *   [min(ac,ad,bc,bd), max(ac,ad,bc,bd)]
 * This gives the exact product interval for independent operands.
 *
 * Handles partially infinite bounds (null = ±∞) via extMul and cornerInclusive.
 * When the min/max is ±∞, the corresponding bound becomes null (exclusive).
 *
 * @example
 * // [2, 3] × [-1, 4] → corners: -2, 8, -3, 12 → [-3, 12]
 * // [2, 3] × [1, +∞) → corners: 2, +∞, 3, +∞ → [2, +∞)
 * // [0, 3] × [2, +∞) → corners: 0, 0, 6, +∞ → [0, +∞) (0×∞=0 convention)
 */
function multiplyBounds(a: Bounds, b: Bounds): Bounds | undefined {
	const aLo = a.lower ?? -Infinity;
	const aHi = a.upper ?? Infinity;
	const bLo = b.lower ?? -Infinity;
	const bHi = b.upper ?? Infinity;

	const pairs: [number, boolean, number, boolean][] = [
		[aLo, a.lowerInclusive, bLo, b.lowerInclusive],
		[aLo, a.lowerInclusive, bHi, b.upperInclusive],
		[aHi, a.upperInclusive, bLo, b.lowerInclusive],
		[aHi, a.upperInclusive, bHi, b.upperInclusive]
	];

	const corners = pairs.map(([ae, aeIncl, be, beIncl]) => ({
		value: extMul(ae, be),
		inclusive: cornerInclusive(ae, aeIncl, be, beIncl)
	}));

	const values = corners.map((c) => c.value);
	const minVal = Math.min(...values);
	const maxVal = Math.max(...values);

	const lower = minVal === -Infinity ? null : minVal;
	const upper = maxVal === Infinity ? null : maxVal;

	return {
		lower,
		upper,
		lowerInclusive: lower === null ? false : corners.some((c) => c.value === minVal && c.inclusive),
		upperInclusive: upper === null ? false : corners.some((c) => c.value === maxVal && c.inclusive)
	};
}

/**
 * Divide two bounds using the four-corners theorem: [a,b] / [c,d].
 *
 * Like multiplication, f(x,y) = x/y has its extrema at the four corners
 * of the rectangle [a,b]×[c,d] when y ≠ 0 (bilinear structure in x for
 * fixed y). The result is [min(a/c,a/d,b/c,b/d), max(a/c,a/d,b/c,b/d)].
 *
 * Special cases:
 * - Divisor contains zero → returns (-∞, +∞) as the quotient is unbounded
 * - Null divisor endpoints (±∞) → quotient approaches 0 (exclusive)
 * - Null numerator endpoints → returns (-∞, +∞) (TODO: extend like multiplyBounds)
 *
 * @returns Bounds of the quotient, or (-∞,+∞) if divisor contains zero
 */
function divideBounds(a: Bounds, b: Bounds): Bounds | undefined {
	// Check if divisor contains zero
	const bContainsZero =
		(b.lower === null || b.lower < 0 || (b.lower === 0 && b.lowerInclusive)) &&
		(b.upper === null || b.upper > 0 || (b.upper === 0 && b.upperInclusive));

	if (bContainsZero) {
		return { lower: null, upper: null, lowerInclusive: false, upperInclusive: false };
	}

	if (a.lower === null || a.upper === null) {
		return { lower: null, upper: null, lowerInclusive: false, upperInclusive: false };
	}

	// Build quotient candidates; null divisor bound (±∞) → quotient approaches 0
	const candidates: { value: number; inclusive: boolean }[] = [];
	const aEndpoints = [
		{ value: a.lower, inclusive: a.lowerInclusive },
		{ value: a.upper, inclusive: a.upperInclusive }
	];
	const bEndpoints = [
		{ value: b.lower, inclusive: b.lowerInclusive },
		{ value: b.upper, inclusive: b.upperInclusive }
	];

	for (const ae of aEndpoints) {
		for (const be of bEndpoints) {
			if (be.value === null) {
				// a / ±∞ → 0 (approached but never reached)
				candidates.push({ value: 0, inclusive: false });
			} else {
				candidates.push({
					value: ae.value / be.value,
					inclusive: ae.inclusive && be.inclusive
				});
			}
		}
	}

	const { min, minInclusive, max, maxInclusive } = findExtremes(candidates);

	return {
		lower: min,
		upper: max,
		lowerInclusive: minInclusive,
		upperInclusive: maxInclusive
	};
}

/**
 * Negate bounds: -[a,b] = [-b,-a].
 *
 * Negation reverses the interval and swaps inclusivity.
 * Null endpoints swap sides: -(null, b] = [-b, null).
 */
function negateBounds(b: Bounds): Bounds {
	return {
		lower: b.upper === null ? null : -b.upper,
		upper: b.lower === null ? null : -b.lower,
		lowerInclusive: b.upperInclusive,
		upperInclusive: b.lowerInclusive
	};
}

// =============================================================================
// Parity Helpers
// =============================================================================

/**
 * Infers parity for addition and subtraction (same rules).
 * even±even = even, odd±odd = even, even±odd = odd, odd±even = odd
 */
function inferAddSubParity(
	leftParity: ParityInfo | undefined,
	rightParity: ParityInfo | undefined
): ParityInfo | undefined {
	if (leftParity === undefined || rightParity === undefined) return undefined;
	return leftParity === rightParity ? 'even' : 'odd';
}

// =============================================================================
// Addition Type Rules
// =============================================================================

/**
 * Infers the type of an addition operation.
 *
 * Type rules:
 * - integer + integer = integer
 * - integer + rational = rational
 * - rational + rational = rational
 * - algebraic + algebraic = algebraic
 * - real + real = real
 * - complex + complex = complex
 *
 * General rule: join(left, right)
 *
 * Sign rules (when both operands have same sign):
 * - positive + positive = positive
 * - negative + negative = negative
 * - zero + x = x's sign
 * - otherwise = unknown
 *
 * @param leftType - Type of left operand
 * @param rightType - Type of right operand
 * @returns Inferred type of the addition
 */
export function inferAdditionType(leftType: MathType, rightType: MathType): MathType {
	const base = join(leftType.base, rightType.base);

	// Sign inference for addition
	let sign: SignInfo | undefined;

	if (leftType.sign === 'zero') {
		sign = rightType.sign;
	} else if (rightType.sign === 'zero') {
		sign = leftType.sign;
	} else if (leftType.sign === 'positive' && rightType.sign === 'positive') {
		sign = 'positive';
	} else if (leftType.sign === 'negative' && rightType.sign === 'negative') {
		sign = 'negative';
	}
	// Otherwise sign is unknown (could be positive, negative, or zero)

	// Finite if both are finite
	const finite =
		leftType.finite !== undefined && rightType.finite !== undefined
			? leftType.finite && rightType.finite
			: undefined;

	// Parity: even+even=even, odd+odd=even, even+odd=odd, odd+even=odd
	const parity = inferAddSubParity(leftType.parity, rightType.parity);

	// Bounds propagation
	const bounds =
		leftType.bounds && rightType.bounds ? addBounds(leftType.bounds, rightType.bounds) : undefined;

	// Deduce sign from bounds when algebraic rules couldn't determine it
	if (sign === undefined && bounds) {
		sign = signFromBounds(bounds);
	}

	return {
		base,
		...(sign !== undefined && { sign }),
		...(finite !== undefined && { finite }),
		...(parity !== undefined && { parity }),
		...(bounds !== undefined && { bounds })
	};
}

// =============================================================================
// Subtraction Type Rules
// =============================================================================

/**
 * Infers the type of a subtraction operation.
 *
 * Type rules same as addition: join(left, right)
 *
 * Sign rules:
 * - x - 0 = x's sign
 * - 0 - x = opposite of x's sign
 * - positive - negative = positive
 * - negative - positive = negative
 * - otherwise = unknown
 *
 * @param leftType - Type of left operand
 * @param rightType - Type of right operand
 * @returns Inferred type of the subtraction
 */
export function inferSubtractionType(leftType: MathType, rightType: MathType): MathType {
	const base = join(leftType.base, rightType.base);

	// Sign inference for subtraction
	let sign: SignInfo | undefined;

	if (rightType.sign === 'zero') {
		sign = leftType.sign;
	} else if (leftType.sign === 'zero') {
		// 0 - positive = negative, 0 - negative = positive
		if (rightType.sign === 'positive') {
			sign = 'negative';
		} else if (rightType.sign === 'negative') {
			sign = 'positive';
		}
	} else if (leftType.sign === 'positive' && rightType.sign === 'negative') {
		sign = 'positive'; // positive - negative = positive
	} else if (leftType.sign === 'negative' && rightType.sign === 'positive') {
		sign = 'negative'; // negative - positive = negative
	}
	// Otherwise sign is unknown

	const finite =
		leftType.finite !== undefined && rightType.finite !== undefined
			? leftType.finite && rightType.finite
			: undefined;

	// Parity: same rules as addition (even-even=even, odd-odd=even, etc.)
	const parity = inferAddSubParity(leftType.parity, rightType.parity);

	// Bounds propagation
	const bounds =
		leftType.bounds && rightType.bounds
			? subtractBounds(leftType.bounds, rightType.bounds)
			: undefined;

	// Deduce sign from bounds when algebraic rules couldn't determine it
	if (sign === undefined && bounds) {
		sign = signFromBounds(bounds);
	}

	return {
		base,
		...(sign !== undefined && { sign }),
		...(finite !== undefined && { finite }),
		...(parity !== undefined && { parity }),
		...(bounds !== undefined && { bounds })
	};
}

// =============================================================================
// Multiplication Type Rules
// =============================================================================

/**
 * Infers the type of a multiplication operation.
 *
 * Type rules:
 * - integer * integer = integer
 * - integer * rational = rational
 * - rational * rational = rational
 * - algebraic * algebraic = algebraic
 * - real * real = real
 * - complex * complex = complex
 *
 * General rule: join(left, right)
 *
 * Sign rules:
 * - x * 0 = 0
 * - 0 * x = 0
 * - positive * positive = positive
 * - negative * negative = positive
 * - positive * negative = negative
 * - negative * positive = negative
 *
 * @param leftType - Type of left operand
 * @param rightType - Type of right operand
 * @returns Inferred type of the multiplication
 */
export function inferMultiplicationType(leftType: MathType, rightType: MathType): MathType {
	const base = join(leftType.base, rightType.base);

	// Sign inference for multiplication
	let sign: SignInfo | undefined;

	if (leftType.sign === 'zero' || rightType.sign === 'zero') {
		sign = 'zero';
	} else if (leftType.sign !== undefined && rightType.sign !== undefined) {
		const leftPositive = leftType.sign === 'positive';
		const leftNegative = leftType.sign === 'negative';
		const rightPositive = rightType.sign === 'positive';
		const rightNegative = rightType.sign === 'negative';

		if ((leftPositive && rightPositive) || (leftNegative && rightNegative)) {
			sign = 'positive';
		} else if ((leftPositive && rightNegative) || (leftNegative && rightPositive)) {
			sign = 'negative';
		} else if (leftType.sign === 'nonzero' && rightType.sign === 'nonzero') {
			sign = 'nonzero';
		}
	}

	const finite =
		leftType.finite !== undefined && rightType.finite !== undefined
			? leftType.finite && rightType.finite
			: undefined;

	// Parity: even*any_integer=even, odd*odd=odd
	let parity: ParityInfo | undefined;
	if (leftType.parity !== undefined && rightType.parity !== undefined) {
		if (leftType.parity === 'even' || rightType.parity === 'even') {
			parity = 'even';
		} else {
			// odd * odd = odd
			parity = 'odd';
		}
	} else if (leftType.parity === 'even' && base === 'integer') {
		// even * integer = even (even if right parity is unknown, if result is integer)
		parity = 'even';
	} else if (rightType.parity === 'even' && base === 'integer') {
		parity = 'even';
	}

	// Bounds propagation
	const bounds =
		leftType.bounds && rightType.bounds
			? multiplyBounds(leftType.bounds, rightType.bounds)
			: undefined;

	// Deduce sign from bounds when algebraic rules couldn't determine it
	if (sign === undefined && bounds) {
		sign = signFromBounds(bounds);
	}

	return {
		base,
		...(sign !== undefined && { sign }),
		...(finite !== undefined && { finite }),
		...(parity !== undefined && { parity }),
		...(bounds !== undefined && { bounds })
	};
}

// =============================================================================
// Division Type Rules
// =============================================================================

/**
 * Infers the type of a division operation.
 *
 * Type rules:
 * - integer / integer = rational (unless divisor divides evenly)
 * - rational / rational = rational
 * - algebraic / algebraic = algebraic
 * - real / real = real
 * - complex / complex = complex
 *
 * Special: integer / integer is ALWAYS rational (we can't know if it simplifies)
 *
 * Sign rules same as multiplication (for non-zero divisor)
 *
 * @param numeratorType - Type of numerator
 * @param denominatorType - Type of denominator
 * @returns Inferred type of the division
 */
export function inferDivisionType(numeratorType: MathType, denominatorType: MathType): MathType {
	// Division of integers yields rational (in general)
	let base: NumericType;

	if (numeratorType.base === 'integer' && denominatorType.base === 'integer') {
		base = 'rational';
	} else if (numeratorType.base === 'integer' && denominatorType.base === 'rational') {
		base = 'rational';
	} else if (numeratorType.base === 'rational' && denominatorType.base === 'integer') {
		base = 'rational';
	} else if (numeratorType.base === 'rational' && denominatorType.base === 'rational') {
		base = 'rational';
	} else {
		base = join(numeratorType.base, denominatorType.base);
	}

	// Sign inference (same rules as multiplication)
	let sign: SignInfo | undefined;

	if (numeratorType.sign === 'zero') {
		// 0 / x = 0 (assuming x != 0)
		sign = 'zero';
	} else if (numeratorType.sign !== undefined && denominatorType.sign !== undefined) {
		const numPositive = numeratorType.sign === 'positive';
		const numNegative = numeratorType.sign === 'negative';
		const denPositive = denominatorType.sign === 'positive';
		const denNegative = denominatorType.sign === 'negative';

		if ((numPositive && denPositive) || (numNegative && denNegative)) {
			sign = 'positive';
		} else if ((numPositive && denNegative) || (numNegative && denPositive)) {
			sign = 'negative';
		} else if (numeratorType.sign === 'nonzero' && denominatorType.sign === 'nonzero') {
			sign = 'nonzero';
		}
	}

	// Division can produce infinity if denominator is zero
	// We assume the denominator is non-zero for type inference
	const finite =
		numeratorType.finite !== undefined && denominatorType.finite !== undefined
			? numeratorType.finite && denominatorType.finite
			: undefined;

	// Bounds propagation
	const bounds =
		numeratorType.bounds && denominatorType.bounds
			? divideBounds(numeratorType.bounds, denominatorType.bounds)
			: undefined;

	// Deduce sign from bounds when algebraic rules couldn't determine it
	if (sign === undefined && bounds) {
		sign = signFromBounds(bounds);
	}

	return {
		base,
		...(sign !== undefined && { sign }),
		...(finite !== undefined && { finite }),
		...(bounds !== undefined && { bounds })
	};
}

// =============================================================================
// Unary Opposite Type Rules
// =============================================================================

/**
 * Infers the type of a unary opposite operation (-x).
 *
 * The base type is preserved. Sign is negated.
 *
 * @param operandType - Type of the operand
 * @returns Inferred type of the negation
 */
export function inferOppositeType(operandType: MathType): MathType {
	// Base type is unchanged
	const base = operandType.base;

	// Negate the sign
	let sign: SignInfo | undefined;
	if (operandType.sign === 'positive') {
		sign = 'negative';
	} else if (operandType.sign === 'negative') {
		sign = 'positive';
	} else if (operandType.sign === 'zero') {
		sign = 'zero';
	} else if (operandType.sign === 'nonzero') {
		sign = 'nonzero';
	}

	// Bounds propagation
	const bounds = operandType.bounds ? negateBounds(operandType.bounds) : undefined;

	// Deduce sign from bounds when algebraic rules couldn't determine it
	if (sign === undefined && bounds) {
		sign = signFromBounds(bounds);
	}

	return {
		base,
		...(sign !== undefined && { sign }),
		...(operandType.finite !== undefined && { finite: operandType.finite }),
		...(operandType.parity !== undefined && { parity: operandType.parity }),
		...(bounds !== undefined && { bounds })
	};
}

// =============================================================================
// Unary Positive Type Rules
// =============================================================================

/**
 * Infers the type of a unary positive operation (+x).
 *
 * This is essentially an identity operation for types.
 *
 * @param operandType - Type of the operand
 * @returns The same type (identity operation)
 */
export function inferPositiveType(operandType: MathType): MathType {
	// Positive sign is identity for types
	return operandType;
}
