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
 * ## Symbolic Interval Arithmetic (Bounds Propagation)
 *
 * Bounds are represented as IntervalDomain with symbolic MathNode endpoints.
 * This preserves exact values (pi, sqrt(2), ln(3), etc.) throughout propagation.
 *
 * For addition and subtraction (Tier 1), the result is always exact:
 *   [a,b] + [c,d] = [a+c, b+d]
 *   [a,b] - [c,d] = [a-d, b-c]
 *
 * For multiplication and division (Tier 3), we use the **four-corners theorem**:
 * since f(x,y) = x*y is bilinear, its extrema over [a,b]x[c,d] are at corners.
 * Endpoint values are evaluated numerically (via endpointToNumber) to determine
 * which corners give the min/max, but the result endpoints remain symbolic
 * MathNode trees built with factory functions.
 *
 * **Important**: this assumes operand intervals are independent. When the same
 * variable appears in both operands (e.g., x*x parsed as multiplication rather
 * than x^2), the four-corners method over-approximates. In practice, x*x is
 * parsed as x^2 and handled by computePowerBounds which is exact.
 *
 * ## Extended Arithmetic (Infinite Bounds)
 *
 * Infinite endpoints are represented as InfinityNode MathNodes.
 * For the four-corners computation with possibly infinite endpoints, we use the
 * convention 0 * +/-Infinity = 0. This is sound for set-theoretic interval products:
 * when x=0 is in interval A, {0*y : y in B} = {0} regardless of B.
 */

import type { MathNode } from '../../types';
import type { MathType, NumericType, ParityInfo, SignInfo } from '../types';
import { join } from '../algebra';
import type { IntervalDomain, Endpoint, EndpointType } from '$lib/math/intervals/types';
import {
	intervalSet,
	interval,
	universalSet,
	isPositiveInfinity,
	isNegativeInfinity,
	endpointToNumber,
	containsValue
} from '$lib/math/intervals';
import {
	add as addNode,
	subtract as subtractNode,
	opposite as oppositeNode,
	implicitMultiply as multiplyNode,
	fraction as divideNode,
	infinity
} from '../../factory';
import { signFromBounds } from './literals';

// =============================================================================
// Symbolic Bounds Helpers
// =============================================================================

/**
 * Extract the overall lower and upper endpoints from an IntervalDomain.
 * Returns null for empty domains.
 */
function extractEndpoints(domain: IntervalDomain): { lo: Endpoint; hi: Endpoint } | null {
	if (domain.kind === 'empty') return null;
	if (domain.kind === 'universal') {
		return {
			lo: { value: infinity('negative'), type: 'open' as EndpointType },
			hi: { value: infinity('positive'), type: 'open' as EndpointType }
		};
	}
	const { intervals } = domain;
	if (intervals.length === 0) return null;
	return {
		lo: intervals[0].lower,
		hi: intervals[intervals.length - 1].upper
	};
}

/** Both must be closed for result to be closed */
function combineEndpointTypes(a: EndpointType, b: EndpointType): EndpointType {
	return a === 'closed' && b === 'closed' ? 'closed' : 'open';
}

/**
 * Build an IntervalDomain from lower and upper endpoints.
 * Returns universal if both endpoints are infinite.
 */
function makeInterval(
	lo: { value: MathNode; type: EndpointType },
	hi: { value: MathNode; type: EndpointType }
): IntervalDomain {
	if (isNegativeInfinity(lo.value) && isPositiveInfinity(hi.value)) {
		return universalSet();
	}
	return intervalSet([interval(lo, hi)]);
}

// =============================================================================
// Symbolic Bounds Propagation Functions
// =============================================================================

/**
 * Addition: [a_lo + b_lo, a_hi + b_hi] (Tier 1 - always exact)
 */
function addIntervalBounds(a: IntervalDomain, b: IntervalDomain): IntervalDomain | undefined {
	const ae = extractEndpoints(a);
	const be = extractEndpoints(b);
	if (!ae || !be) return undefined;

	const loInf = isNegativeInfinity(ae.lo.value) || isNegativeInfinity(be.lo.value);
	const hiInf = isPositiveInfinity(ae.hi.value) || isPositiveInfinity(be.hi.value);

	return makeInterval(
		{
			value: loInf ? infinity('negative') : addNode(ae.lo.value, be.lo.value),
			type: loInf ? 'open' : combineEndpointTypes(ae.lo.type, be.lo.type)
		},
		{
			value: hiInf ? infinity('positive') : addNode(ae.hi.value, be.hi.value),
			type: hiInf ? 'open' : combineEndpointTypes(ae.hi.type, be.hi.type)
		}
	);
}

/**
 * Subtraction: [a_lo - b_hi, a_hi - b_lo] (Tier 1 - always exact)
 */
function subtractIntervalBounds(a: IntervalDomain, b: IntervalDomain): IntervalDomain | undefined {
	const ae = extractEndpoints(a);
	const be = extractEndpoints(b);
	if (!ae || !be) return undefined;

	const loInf = isNegativeInfinity(ae.lo.value) || isPositiveInfinity(be.hi.value);
	const hiInf = isPositiveInfinity(ae.hi.value) || isNegativeInfinity(be.lo.value);

	return makeInterval(
		{
			value: loInf ? infinity('negative') : subtractNode(ae.lo.value, be.hi.value),
			type: loInf ? 'open' : combineEndpointTypes(ae.lo.type, be.hi.type)
		},
		{
			value: hiInf ? infinity('positive') : subtractNode(ae.hi.value, be.lo.value),
			type: hiInf ? 'open' : combineEndpointTypes(ae.hi.type, be.lo.type)
		}
	);
}

/**
 * Negation: [-hi, -lo] (Tier 1 - always exact)
 */
function negateIntervalBounds(d: IntervalDomain): IntervalDomain | undefined {
	const e = extractEndpoints(d);
	if (!e) return undefined;

	const loIsNegInf = isNegativeInfinity(e.lo.value);
	const hiIsPosInf = isPositiveInfinity(e.hi.value);

	return makeInterval(
		{
			value: hiIsPosInf ? infinity('negative') : oppositeNode(e.hi.value),
			type: e.hi.type
		},
		{
			value: loIsNegInf ? infinity('positive') : oppositeNode(e.lo.value),
			type: e.lo.type
		}
	);
}

/**
 * Multiplication using four-corners theorem (Tier 2/3).
 *
 * Evaluates all four corner products numerically to find min/max,
 * but builds result endpoints as symbolic MathNode trees.
 * Uses the convention 0 * Infinity = 0 for set-theoretic soundness.
 */
function multiplyIntervalBounds(a: IntervalDomain, b: IntervalDomain): IntervalDomain | undefined {
	const ae = extractEndpoints(a);
	const be = extractEndpoints(b);
	if (!ae || !be) return undefined;

	const aLoNum = endpointToNumber(ae.lo.value);
	const aHiNum = endpointToNumber(ae.hi.value);
	const bLoNum = endpointToNumber(be.lo.value);
	const bHiNum = endpointToNumber(be.hi.value);

	// If any endpoint can't be evaluated, skip bounds
	if (isNaN(aLoNum) || isNaN(aHiNum) || isNaN(bLoNum) || isNaN(bHiNum)) {
		return undefined;
	}

	// Four-corners: compute all products numerically to find min/max
	const corners = [
		{ aEp: ae.lo, bEp: be.lo, val: aLoNum * bLoNum },
		{ aEp: ae.lo, bEp: be.hi, val: aLoNum * bHiNum },
		{ aEp: ae.hi, bEp: be.lo, val: aHiNum * bLoNum },
		{ aEp: ae.hi, bEp: be.hi, val: aHiNum * bHiNum }
	];

	// Handle 0 * Infinity = 0 convention
	for (const c of corners) {
		if (!isFinite(c.val)) {
			const aNum = endpointToNumber(c.aEp.value);
			const bNum = endpointToNumber(c.bEp.value);
			if (aNum === 0 || bNum === 0) {
				c.val = 0;
			}
		}
	}

	let minCorner = corners[0];
	let maxCorner = corners[0];
	for (const c of corners) {
		if (c.val < minCorner.val) minCorner = c;
		if (c.val > maxCorner.val) maxCorner = c;
	}

	const loValue =
		minCorner.val === -Infinity
			? infinity('negative')
			: multiplyNode(minCorner.aEp.value, minCorner.bEp.value);
	const hiValue =
		maxCorner.val === Infinity
			? infinity('positive')
			: multiplyNode(maxCorner.aEp.value, maxCorner.bEp.value);

	const loType: EndpointType = !isFinite(minCorner.val)
		? 'open'
		: combineEndpointTypes(minCorner.aEp.type, minCorner.bEp.type);
	const hiType: EndpointType = !isFinite(maxCorner.val)
		? 'open'
		: combineEndpointTypes(maxCorner.aEp.type, maxCorner.bEp.type);

	return makeInterval({ value: loValue, type: loType }, { value: hiValue, type: hiType });
}

/**
 * Division using four-corners theorem (Tier 2/3).
 *
 * If the divisor contains zero, returns universal set (unbounded).
 * Otherwise evaluates all four corner quotients numerically to find min/max,
 * but builds result endpoints as symbolic MathNode trees.
 */
function divideIntervalBounds(a: IntervalDomain, b: IntervalDomain): IntervalDomain | undefined {
	const ae = extractEndpoints(a);
	const be = extractEndpoints(b);
	if (!ae || !be) return undefined;

	// Check if divisor contains zero
	if (containsValue(b, 0)) {
		return universalSet();
	}

	const aLoNum = endpointToNumber(ae.lo.value);
	const aHiNum = endpointToNumber(ae.hi.value);
	const bLoNum = endpointToNumber(be.lo.value);
	const bHiNum = endpointToNumber(be.hi.value);

	if (isNaN(aLoNum) || isNaN(aHiNum) || isNaN(bLoNum) || isNaN(bHiNum)) {
		return undefined;
	}

	// If numerator is unbounded, result is universal
	if (!isFinite(aLoNum) || !isFinite(aHiNum)) {
		return universalSet();
	}

	// Four corners for division
	const corners: { aEp: Endpoint; bEp: Endpoint; val: number }[] = [];
	const aEndpoints = [ae.lo, ae.hi];
	const bEndpoints = [be.lo, be.hi];

	for (const aEp of aEndpoints) {
		for (const bEp of bEndpoints) {
			const bNum = endpointToNumber(bEp.value);
			const aNum = endpointToNumber(aEp.value);
			if (!isFinite(bNum)) {
				// a / +/-Infinity -> 0
				corners.push({ aEp, bEp, val: 0 });
			} else {
				corners.push({ aEp, bEp, val: aNum / bNum });
			}
		}
	}

	let minCorner = corners[0];
	let maxCorner = corners[0];
	for (const c of corners) {
		if (c.val < minCorner.val) minCorner = c;
		if (c.val > maxCorner.val) maxCorner = c;
	}

	const loValue = divideNode(minCorner.aEp.value, minCorner.bEp.value);
	const hiValue = divideNode(maxCorner.aEp.value, maxCorner.bEp.value);

	// For corners where b was infinite, endpoint is open (approached but not reached)
	const minBIsInf = !isFinite(endpointToNumber(minCorner.bEp.value));
	const maxBIsInf = !isFinite(endpointToNumber(maxCorner.bEp.value));

	const loType: EndpointType = minBIsInf
		? 'open'
		: combineEndpointTypes(minCorner.aEp.type, minCorner.bEp.type);
	const hiType: EndpointType = maxBIsInf
		? 'open'
		: combineEndpointTypes(maxCorner.aEp.type, maxCorner.bEp.type);

	return makeInterval({ value: loValue, type: loType }, { value: hiValue, type: hiType });
}

// =============================================================================
// Parity Helpers
// =============================================================================

/**
 * Infers parity for addition and subtraction (same rules).
 * even+/-even = even, odd+/-odd = even, even+/-odd = odd, odd+/-even = odd
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
		leftType.bounds && rightType.bounds
			? addIntervalBounds(leftType.bounds, rightType.bounds)
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
			? subtractIntervalBounds(leftType.bounds, rightType.bounds)
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
			? multiplyIntervalBounds(leftType.bounds, rightType.bounds)
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
			? divideIntervalBounds(numeratorType.bounds, denominatorType.bounds)
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
	const bounds = operandType.bounds ? negateIntervalBounds(operandType.bounds) : undefined;

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
