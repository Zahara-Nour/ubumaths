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
 */

import type { MathType, NumericType, ParityInfo, SignInfo } from '../types';
import { join } from '../algebra';
import type { Bounds } from '$lib/math/intervals/algebra';

// =============================================================================
// Bounds Arithmetic Helpers
// =============================================================================

/**
 * Add two bounds: [a,b] + [c,d] = [a+c, b+d]
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
 * Subtract two bounds: [a,b] - [c,d] = [a-d, b-c]
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
 * Multiply two bounds using the four-corners approach.
 * [a,b] * [c,d] = [min(ac,ad,bc,bd), max(ac,ad,bc,bd)]
 */
function multiplyBounds(a: Bounds, b: Bounds): Bounds | undefined {
	// If either is unbounded, result is unbounded
	if (a.lower === null || a.upper === null || b.lower === null || b.upper === null) {
		return { lower: null, upper: null, lowerInclusive: false, upperInclusive: false };
	}

	const products = [
		{ value: a.lower * b.lower, aInc: a.lowerInclusive, bInc: b.lowerInclusive },
		{ value: a.lower * b.upper, aInc: a.lowerInclusive, bInc: b.upperInclusive },
		{ value: a.upper * b.lower, aInc: a.upperInclusive, bInc: b.lowerInclusive },
		{ value: a.upper * b.upper, aInc: a.upperInclusive, bInc: b.upperInclusive }
	];

	const minP = products.reduce((min, p) => (p.value < min.value ? p : min));
	const maxP = products.reduce((max, p) => (p.value > max.value ? p : max));

	return {
		lower: minP.value,
		upper: maxP.value,
		lowerInclusive: minP.aInc && minP.bInc,
		upperInclusive: maxP.aInc && maxP.bInc
	};
}

/**
 * Divide two bounds: [a,b] / [c,d]
 * Returns undefined if divisor contains zero.
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

	const quotients = [
		{ value: a.lower / b.lower!, aInc: a.lowerInclusive, bInc: b.lowerInclusive },
		{ value: a.lower / b.upper!, aInc: a.lowerInclusive, bInc: b.upperInclusive },
		{ value: a.upper / b.lower!, aInc: a.upperInclusive, bInc: b.lowerInclusive },
		{ value: a.upper / b.upper!, aInc: a.upperInclusive, bInc: b.upperInclusive }
	];

	const minQ = quotients.reduce((min, q) => (q.value < min.value ? q : min));
	const maxQ = quotients.reduce((max, q) => (q.value > max.value ? q : max));

	return {
		lower: minQ.value,
		upper: maxQ.value,
		lowerInclusive: minQ.aInc && minQ.bInc,
		upperInclusive: maxQ.aInc && maxQ.bInc
	};
}

/**
 * Negate bounds: -[a,b] = [-b,-a]
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
