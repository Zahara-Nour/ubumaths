/**
 * Power Sign Rules
 *
 * Determines the sign of a power expression base^exponent.
 *
 * Mathematical rules for integer exponents:
 * - Even exponent: result is non-negative (positive if base != 0)
 * - Odd exponent: result has same sign as base
 *
 * For fractional exponents p/q:
 * - q even (even root): requires base >= 0, result >= 0
 * - q odd (odd root): preserves sign structure
 *
 * @module mathAST/sign/rules/power
 */

import type { Sign } from '../types';
import type { MathNode } from '../../types';

/**
 * Rational exponent representation.
 * Used when the exponent can be expressed as a fraction p/q.
 */
export interface RationalExponent {
	readonly numerator: number;
	readonly denominator: number;
}

/**
 * Determines the sign of a power expression: base^exponent
 *
 * @param signBase - The sign of the base
 * @param exponent - The exponent as a number or rational fraction
 * @returns The sign of the power
 *
 * @example
 * // Even integer exponent
 * signOfPower('negative', 2) // => 'positive' ((-x)^2 > 0)
 * signOfPower('positive', 2) // => 'positive'
 *
 * // Odd integer exponent
 * signOfPower('negative', 3) // => 'negative' ((-x)^3 < 0)
 * signOfPower('positive', 3) // => 'positive'
 *
 * // Fractional exponent with even denominator (square root)
 * signOfPower('positive', { numerator: 1, denominator: 2 }) // => 'positive'
 * signOfPower('negative', { numerator: 1, denominator: 2 }) // => 'unknown' (domain issue)
 *
 * // Fractional exponent with odd denominator (cube root)
 * signOfPower('negative', { numerator: 1, denominator: 3 }) // => 'negative'
 */
export function signOfPower(signBase: Sign, exponent: number | RationalExponent): Sign {
	// Handle zero base
	if (signBase === 'zero') {
		// 0^n = 0 for n > 0, undefined for n <= 0
		const expValue =
			typeof exponent === 'number' ? exponent : exponent.numerator / exponent.denominator;
		if (expValue > 0) {
			return 'zero';
		}
		// 0^0 or 0^(-n) is undefined/problematic
		return 'unknown';
	}

	// Handle unknown base
	if (signBase === 'unknown') {
		return 'unknown';
	}

	// Normalize exponent to rational form
	const rational = normalizeExponent(exponent);

	// Handle zero exponent: anything^0 = 1 (for non-zero base)
	if (rational.numerator === 0) {
		return 'positive';
	}

	// Check if denominator is even (even root)
	const isEvenRoot = rational.denominator % 2 === 0;

	if (isEvenRoot) {
		// Even root requires non-negative base
		if (signBase === 'negative') {
			// Negative base with even root is not real
			return 'unknown';
		}
		// Positive base with even root is positive
		// The result's sign depends on whether numerator is even or odd
		// (sqrt(x))^2 = x, but sqrt(x) >= 0, so (sqrt(x))^3 >= 0 too
		// Actually, x^(p/q) where q is even and x > 0 is always positive
		return 'positive';
	}

	// Odd root: preserves sign structure
	// For odd q: (-x)^(p/q) = -(x^(p/q)) when p is odd
	// For odd q: (-x)^(p/q) = (x^(p/q)) when p is even

	const isEvenNumerator = rational.numerator % 2 === 0;

	if (signBase === 'positive') {
		// Positive base always gives positive result for real exponents
		return 'positive';
	}

	// signBase === 'negative' with odd root
	if (isEvenNumerator) {
		// (-x)^(2/3) = (x^2)^(1/3) = positive for x > 0
		return 'positive';
	} else {
		// (-x)^(1/3) = -(x^(1/3)) = negative for x > 0
		// (-x)^(3/5) = ((-x)^3)^(1/5) = (-(x^3))^(1/5) = -(x^(3/5)) = negative
		return 'negative';
	}
}

/**
 * Normalizes an exponent to a RationalExponent.
 *
 * @param exponent - Number or rational exponent
 * @returns Normalized rational exponent
 */
function normalizeExponent(exponent: number | RationalExponent): RationalExponent {
	if (typeof exponent === 'number') {
		// Check if it's an integer
		if (Number.isInteger(exponent)) {
			return { numerator: exponent, denominator: 1 };
		}

		// Try to express as a simple fraction
		// For common cases like 0.5 = 1/2
		const commonFractions: Record<number, RationalExponent> = {
			0.5: { numerator: 1, denominator: 2 },
			0.25: { numerator: 1, denominator: 4 },
			0.75: { numerator: 3, denominator: 4 },
			0.333333333333333: { numerator: 1, denominator: 3 },
			0.666666666666667: { numerator: 2, denominator: 3 },
			0.2: { numerator: 1, denominator: 5 },
			0.4: { numerator: 2, denominator: 5 },
			0.6: { numerator: 3, denominator: 5 },
			0.8: { numerator: 4, denominator: 5 }
		};

		const absExp = Math.abs(exponent);
		const sign = exponent >= 0 ? 1 : -1;

		for (const [decimal, rational] of Object.entries(commonFractions)) {
			if (Math.abs(absExp - parseFloat(decimal)) < 1e-10) {
				return { numerator: sign * rational.numerator, denominator: rational.denominator };
			}
		}

		// Fallback: treat as p/1 (may lose precision for irrational exponents)
		// This is a simplification; real irrational exponents need special handling
		return { numerator: exponent, denominator: 1 };
	}

	return exponent;
}

/**
 * Determines the sign of a power for integer exponents only.
 *
 * This is a simplified version for when the exponent is guaranteed to be an integer.
 *
 * @param signBase - The sign of the base
 * @param exponent - Integer exponent
 * @returns The sign of the power
 *
 * @example
 * signOfIntegerPower('negative', 2) // => 'positive'
 * signOfIntegerPower('negative', 3) // => 'negative'
 * signOfIntegerPower('positive', -2) // => 'positive'
 */
export function signOfIntegerPower(signBase: Sign, exponent: number): Sign {
	// Handle zero base
	if (signBase === 'zero') {
		if (exponent > 0) return 'zero';
		return 'unknown'; // 0^0 or 0^(-n)
	}

	// Handle unknown base
	if (signBase === 'unknown') {
		return 'unknown';
	}

	// Handle zero exponent
	if (exponent === 0) {
		return 'positive'; // x^0 = 1 for x != 0
	}

	// Positive base: always positive result
	if (signBase === 'positive') {
		return 'positive';
	}

	// Negative base: depends on exponent parity
	// (-x)^n = (-1)^n * x^n
	const isEven = Math.abs(exponent) % 2 === 0;
	return isEven ? 'positive' : 'negative';
}

/**
 * Attempts to extract a rational exponent from a MathNode.
 *
 * Handles cases like:
 * - NumberNode: integer or decimal
 * - Division of two NumberNodes: p/q
 * - Function sqrt: represents 1/2
 *
 * @param node - The exponent node
 * @returns The rational exponent if extractable, null otherwise
 *
 * @example
 * extractRationalExponent({ type: 'number', value: '2' }) // => { numerator: 2, denominator: 1 }
 * extractRationalExponent(division(2, 3)) // => { numerator: 2, denominator: 3 }
 */
export function extractRationalExponent(node: MathNode): RationalExponent | number | null {
	switch (node.type) {
		case 'number': {
			const value = parseFloat(node.value);
			if (Number.isNaN(value)) return null;
			if (Number.isInteger(value)) {
				return { numerator: value, denominator: 1 };
			}
			return value;
		}

		case 'division': {
			// Try to extract numerator and denominator as numbers
			const numNode = node.numerator;
			const denNode = node.denominator;

			if (numNode.type !== 'number' || denNode.type !== 'number') {
				return null;
			}

			const num = parseFloat(numNode.value);
			const den = parseFloat(denNode.value);

			if (Number.isNaN(num) || Number.isNaN(den) || den === 0) {
				return null;
			}

			if (!Number.isInteger(num) || !Number.isInteger(den)) {
				return num / den;
			}

			return { numerator: num, denominator: den };
		}

		case 'opposite': {
			// Handle negative exponents like -2 or -(1/2)
			const inner = extractRationalExponent(node.operand);
			if (inner === null) return null;

			if (typeof inner === 'number') {
				return -inner;
			}
			return { numerator: -inner.numerator, denominator: inner.denominator };
		}

		case 'function': {
			// Handle sqrt as 1/2 exponent
			if (node.name === 'sqrt' && node.args.length === 1) {
				// sqrt(x) is x^(1/2), but this function extracts the exponent itself
				// So if the exponent IS sqrt(something), we can't easily extract it
				return null;
			}
			return null;
		}

		default:
			return null;
	}
}
