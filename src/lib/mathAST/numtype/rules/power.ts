/**
 * Type Inference Rules for Power Operations
 *
 * Handles type inference for:
 * - Superscript/Power: base^exponent
 * - Square root: sqrt(x) = x^(1/2)
 * - Nth root: x^(1/n)
 */

import type { MathType, SignInfo } from '../types';
import { join, isSubtype } from '../algebra';
import { COMPLEX_TYPE, UNKNOWN_TYPE } from '../types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if a value is a perfect square.
 */
function isPerfectSquare(n: number): boolean {
	if (n < 0 || !Number.isInteger(n)) return false;
	const sqrt = Math.sqrt(n);
	return Number.isInteger(sqrt);
}

/**
 * Checks if a value is a perfect nth power.
 */
function isPerfectPower(base: number, n: number): boolean {
	if (!Number.isInteger(n) || n <= 0) return false;
	if (base < 0 && n % 2 === 0) return false; // Even root of negative
	const absBase = Math.abs(base);
	const root = Math.pow(absBase, 1 / n);
	// Check if root is an integer
	return Math.abs(root - Math.round(root)) < 1e-10;
}

/**
 * Extracts integer value from a type if available.
 * Returns undefined if the type doesn't carry a specific value.
 */
export interface TypeWithValue extends MathType {
	readonly numericValue?: number;
}

// =============================================================================
// Power Type Rules
// =============================================================================

/**
 * Infers the type of a power operation (base^exponent).
 *
 * Type rules:
 *
 * Integer exponent:
 * - integer ^ positive_integer = integer
 * - integer ^ negative_integer = rational
 * - integer ^ 0 = integer (= 1)
 * - rational ^ integer = rational
 * - real ^ integer = real
 *
 * Rational exponent (roots):
 * - integer ^ (1/2) = integer (if perfect square) or irrational_algebraic
 * - integer ^ (1/n) = integer (if perfect nth power) or irrational_algebraic
 * - positive_real ^ rational = real or irrational_algebraic
 * - negative_real ^ (p/q) with even q = complex
 *
 * Real/transcendental exponent:
 * - positive_real ^ real = real (often transcendental)
 * - integer ^ transcendental = transcendental
 *
 * Complex:
 * - anything ^ complex = complex
 * - negative ^ non_integer = complex
 *
 * @param baseType - Type of the base (with optional numeric value)
 * @param exponentType - Type of the exponent (with optional numeric value)
 * @param baseValue - Optional known numeric value of base
 * @param exponentValue - Optional known numeric value of exponent
 * @returns Inferred type of the power
 */
export function inferPowerType(
	baseType: MathType,
	exponentType: MathType,
	baseValue?: number,
	exponentValue?: number
): MathType {
	// Complex exponent always yields complex
	if (exponentType.base === 'complex') {
		return COMPLEX_TYPE;
	}

	// Complex base always yields complex
	if (baseType.base === 'complex') {
		return COMPLEX_TYPE;
	}

	// x^0 = 1 (integer)
	if (exponentType.sign === 'zero' || exponentValue === 0) {
		return { base: 'integer', sign: 'positive', finite: true };
	}

	// x^1 = x (same type)
	if (exponentValue === 1) {
		return baseType;
	}

	// 0^positive = 0, 0^negative = undefined (we return unknown)
	if (baseType.sign === 'zero' || baseValue === 0) {
		if (exponentType.sign === 'positive' || (exponentValue !== undefined && exponentValue > 0)) {
			return { base: 'integer', sign: 'zero', finite: true };
		}
		return UNKNOWN_TYPE; // 0^negative is undefined
	}

	// 1^anything = 1
	if (baseValue === 1) {
		return { base: 'integer', sign: 'positive', finite: true };
	}

	// Integer exponent cases
	if (exponentType.base === 'integer' && Number.isInteger(exponentValue ?? NaN)) {
		return inferIntegerExponentType(baseType, exponentValue!, baseValue);
	}

	// Rational exponent (roots)
	if (isSubtype(exponentType.base, 'rational')) {
		return inferRationalExponentType(baseType, exponentType, baseValue, exponentValue);
	}

	// Real/transcendental exponent
	if (isSubtype(exponentType.base, 'real')) {
		return inferRealExponentType(baseType, exponentType, baseValue);
	}

	// Unknown exponent
	return UNKNOWN_TYPE;
}

/**
 * Infers type for integer exponent: base^n where n is integer.
 */
function inferIntegerExponentType(
	baseType: MathType,
	exponent: number,
	_baseValue?: number
): MathType {
	// Positive integer exponent
	if (exponent > 0) {
		// integer ^ positive_integer = integer
		if (baseType.base === 'integer') {
			// Sign: positive^even = positive, positive^odd = positive
			//       negative^even = positive, negative^odd = negative
			let sign: SignInfo | undefined;
			if (baseType.sign === 'positive') {
				sign = 'positive';
			} else if (baseType.sign === 'negative') {
				sign = exponent % 2 === 0 ? 'positive' : 'negative';
			} else if (baseType.sign === 'zero') {
				sign = 'zero';
			}
			return { base: 'integer', ...(sign !== undefined && { sign }), finite: true };
		}

		// rational ^ positive_integer = rational
		if (baseType.base === 'rational') {
			let sign: SignInfo | undefined;
			if (baseType.sign === 'positive') {
				sign = 'positive';
			} else if (baseType.sign === 'negative') {
				sign = exponent % 2 === 0 ? 'positive' : 'negative';
			}
			return { base: 'rational', ...(sign !== undefined && { sign }), finite: true };
		}

		// algebraic ^ positive_integer = algebraic
		if (isSubtype(baseType.base, 'algebraic')) {
			return { base: 'algebraic', finite: true };
		}

		// real ^ positive_integer = real
		if (isSubtype(baseType.base, 'real')) {
			return { base: 'real', finite: true };
		}
	}

	// Negative integer exponent: base^(-n) = 1/base^n
	if (exponent < 0) {
		// integer ^ negative_integer = rational
		if (baseType.base === 'integer') {
			let sign: SignInfo | undefined;
			const absExp = Math.abs(exponent);
			if (baseType.sign === 'positive') {
				sign = 'positive';
			} else if (baseType.sign === 'negative') {
				sign = absExp % 2 === 0 ? 'positive' : 'negative';
			}
			return { base: 'rational', ...(sign !== undefined && { sign }), finite: true };
		}

		// rational ^ negative_integer = rational
		if (baseType.base === 'rational') {
			return { base: 'rational', finite: true };
		}

		// real ^ negative_integer = real
		if (isSubtype(baseType.base, 'real')) {
			return { base: 'real', finite: true };
		}
	}

	return { base: join(baseType.base, 'real') };
}

/**
 * Infers type for rational exponent (roots): base^(p/q).
 */
function inferRationalExponentType(
	baseType: MathType,
	exponentType: MathType,
	baseValue?: number,
	exponentValue?: number
): MathType {
	// Negative base with rational exponent often yields complex
	if (baseType.sign === 'negative' || (baseValue !== undefined && baseValue < 0)) {
		// Check if the exponent has an even denominator
		// e.g., (-1)^(1/2) = complex, but (-1)^(1/3) = -1 (real)
		// For safety, we assume complex unless we can prove otherwise
		if (exponentValue !== undefined) {
			// Try to extract the denominator
			const frac = toFraction(exponentValue);
			if (frac && frac[1] % 2 === 0) {
				return COMPLEX_TYPE;
			}
			// Odd denominator with negative base is real
			if (frac && frac[1] % 2 === 1) {
				return { base: 'real', finite: true };
			}
		}
		// Conservative: assume complex for negative base
		return COMPLEX_TYPE;
	}

	// Positive base with rational exponent
	if (baseType.sign === 'positive' || (baseValue !== undefined && baseValue > 0)) {
		// Check for perfect roots
		if (baseValue !== undefined && exponentValue !== undefined) {
			const frac = toFraction(exponentValue);
			if (frac) {
				const [_p, q] = frac;
				// base^(p/q) = (base^(1/q))^p
				// If base is a perfect qth power, result might be integer/rational
				if (baseType.base === 'integer' && Number.isInteger(baseValue)) {
					if (isPerfectPower(baseValue, q)) {
						// Perfect root yields integer
						return { base: 'integer', sign: 'positive', finite: true };
					}
					// Non-perfect root of positive integer is irrational algebraic
					return { base: 'irrational_algebraic', sign: 'positive', finite: true };
				}
			}
		}

		// Positive integer base with rational exponent (unknown value)
		if (baseType.base === 'integer') {
			// sqrt(n), cbrt(n), etc. - assume irrational algebraic (conservative)
			return { base: 'irrational_algebraic', sign: 'positive', finite: true };
		}

		// Positive rational base with rational exponent
		if (baseType.base === 'rational') {
			return { base: 'algebraic', sign: 'positive', finite: true };
		}

		// Positive real with rational exponent
		return { base: 'real', sign: 'positive', finite: true };
	}

	// Zero base: 0^positive_rational = 0
	if (baseType.sign === 'zero' || baseValue === 0) {
		if (exponentType.sign === 'positive' || (exponentValue !== undefined && exponentValue > 0)) {
			return { base: 'integer', sign: 'zero', finite: true };
		}
		return UNKNOWN_TYPE;
	}

	// Unknown sign - could be complex
	return { base: 'real', finite: true };
}

/**
 * Infers type for real/transcendental exponent.
 */
function inferRealExponentType(
	baseType: MathType,
	exponentType: MathType,
	baseValue?: number
): MathType {
	// Negative base with irrational exponent is complex
	if (baseType.sign === 'negative' || (baseValue !== undefined && baseValue < 0)) {
		return COMPLEX_TYPE;
	}

	// Positive base with transcendental exponent often yields transcendental
	// e.g., 2^π is transcendental
	if (exponentType.base === 'transcendental') {
		if (baseType.sign === 'positive') {
			return { base: 'transcendental', sign: 'positive', finite: true };
		}
		return { base: 'transcendental', finite: true };
	}

	// General real exponent
	return { base: 'real', finite: true };
}

// =============================================================================
// Square Root Type Rules
// =============================================================================

/**
 * Infers the type of a square root operation: sqrt(x) = x^(1/2).
 *
 * @param operandType - Type of the operand
 * @param operandValue - Optional known numeric value
 * @returns Inferred type of the square root
 */
export function inferSqrtType(operandType: MathType, operandValue?: number): MathType {
	// sqrt of negative is complex
	if (operandType.sign === 'negative' || (operandValue !== undefined && operandValue < 0)) {
		return COMPLEX_TYPE;
	}

	// sqrt(0) = 0
	if (operandType.sign === 'zero' || operandValue === 0) {
		return { base: 'integer', sign: 'zero', finite: true };
	}

	// sqrt of positive integer
	if (operandType.base === 'integer' && operandValue !== undefined) {
		if (isPerfectSquare(operandValue)) {
			return { base: 'integer', sign: 'positive', finite: true };
		}
		return { base: 'irrational_algebraic', sign: 'positive', finite: true };
	}

	// sqrt of positive integer (unknown value) - assume irrational algebraic
	if (operandType.base === 'integer' && operandType.sign === 'positive') {
		return { base: 'irrational_algebraic', sign: 'positive', finite: true };
	}

	// sqrt of positive rational
	if (operandType.base === 'rational' && operandType.sign === 'positive') {
		return { base: 'algebraic', sign: 'positive', finite: true };
	}

	// sqrt of positive real
	if (operandType.sign === 'positive') {
		return { base: 'real', sign: 'positive', finite: true };
	}

	// Unknown sign - could be complex
	return { base: 'complex' };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Converts a decimal number to a fraction [numerator, denominator].
 * Returns null if conversion is not possible with reasonable precision.
 */
function toFraction(value: number, maxDenom: number = 1000): [number, number] | null {
	if (!Number.isFinite(value)) return null;

	// Check if it's an integer
	if (Number.isInteger(value)) {
		return [value, 1];
	}

	// Try to find a fraction representation
	for (let d = 2; d <= maxDenom; d++) {
		const n = value * d;
		if (Math.abs(n - Math.round(n)) < 1e-10) {
			const numerator = Math.round(n);
			const denominator = d;
			// Simplify
			const g = gcd(Math.abs(numerator), denominator);
			return [numerator / g, denominator / g];
		}
	}

	return null;
}

/**
 * Greatest common divisor using Euclidean algorithm.
 */
function gcd(a: number, b: number): number {
	while (b !== 0) {
		const t = b;
		b = a % b;
		a = t;
	}
	return a;
}
