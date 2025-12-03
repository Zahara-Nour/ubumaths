/**
 * MathAST Normal Form - Rational Arithmetic
 *
 * Exact arithmetic operations on rational numbers using BigInt.
 * All operations maintain the invariants:
 * - Fractions are always reduced (gcd(|n|, d) = 1)
 * - Denominator is always positive (d > 0)
 * - Sign is stored in numerator only
 */

import type { Rational, ComparisonResult } from './types';

// =============================================================================
// Constants
// =============================================================================

/** The rational number 0 (zero) */
export const ZERO: Rational = { n: 0n, d: 1n };

/** The rational number 1 (one) */
export const ONE: Rational = { n: 1n, d: 1n };

/** The rational number -1 (minus one) */
export const MINUS_ONE: Rational = { n: -1n, d: 1n };

/** The rational number 2 (two) */
export const TWO: Rational = { n: 2n, d: 1n };

/** The rational number 1/2 (one half) */
export const HALF: Rational = { n: 1n, d: 2n };

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Computes the greatest common divisor of two BigInts using Euclidean algorithm.
 * Always returns a positive value.
 *
 * @param a - First BigInt
 * @param b - Second BigInt
 * @returns The GCD of |a| and |b|, always positive
 *
 * @example
 * gcd(12n, 8n)  // 4n
 * gcd(-12n, 8n) // 4n
 * gcd(0n, 5n)   // 5n
 */
export function gcd(a: bigint, b: bigint): bigint {
	// Work with absolute values
	a = a < 0n ? -a : a;
	b = b < 0n ? -b : b;

	// Euclidean algorithm
	while (b !== 0n) {
		const temp = b;
		b = a % b;
		a = temp;
	}

	return a;
}

/**
 * Computes the least common multiple of two BigInts.
 * Always returns a positive value.
 *
 * @param a - First BigInt
 * @param b - Second BigInt
 * @returns The LCM of |a| and |b|, always positive
 *
 * @example
 * lcm(4n, 6n)   // 12n
 * lcm(-4n, 6n)  // 12n
 * lcm(0n, 5n)   // 0n
 */
export function lcm(a: bigint, b: bigint): bigint {
	// Work with absolute values
	a = a < 0n ? -a : a;
	b = b < 0n ? -b : b;

	if (a === 0n || b === 0n) return 0n;

	return (a / gcd(a, b)) * b;
}

/**
 * Returns the absolute value of a BigInt.
 *
 * @param n - A BigInt
 * @returns |n|
 */
export function absBigInt(n: bigint): bigint {
	return n < 0n ? -n : n;
}

// =============================================================================
// Constructor
// =============================================================================

/**
 * Creates a new Rational from numerator and denominator.
 * Automatically reduces the fraction and normalizes the sign.
 *
 * @param n - Numerator
 * @param d - Denominator (must not be zero)
 * @returns A reduced Rational with positive denominator
 * @throws Error if denominator is zero
 *
 * @example
 * rational(6n, 9n)   // { n: 2n, d: 3n }
 * rational(-6n, 9n)  // { n: -2n, d: 3n }
 * rational(6n, -9n)  // { n: -2n, d: 3n }
 * rational(0n, 5n)   // { n: 0n, d: 1n }
 */
export function rational(n: bigint, d: bigint): Rational {
	if (d === 0n) {
		throw new Error('Rational: denominator cannot be zero');
	}

	// Handle zero numerator
	if (n === 0n) {
		return ZERO;
	}

	// Normalize sign: move negative to numerator
	if (d < 0n) {
		n = -n;
		d = -d;
	}

	// Reduce fraction
	const g = gcd(n, d);
	return {
		n: n / g,
		d: d / g
	};
}

/**
 * Creates a Rational from an integer.
 *
 * @param n - An integer (BigInt or number)
 * @returns A Rational representing the integer
 *
 * @example
 * fromInteger(5n)  // { n: 5n, d: 1n }
 * fromInteger(5)   // { n: 5n, d: 1n }
 */
export function fromInteger(n: bigint | number): Rational {
	const bigN = typeof n === 'number' ? BigInt(n) : n;
	if (bigN === 0n) return ZERO;
	if (bigN === 1n) return ONE;
	if (bigN === -1n) return MINUS_ONE;
	return { n: bigN, d: 1n };
}

// =============================================================================
// Arithmetic Operations
// =============================================================================

/**
 * Adds two rationals.
 *
 * @param a - First rational
 * @param b - Second rational
 * @returns a + b, reduced
 *
 * @example
 * addRational({ n: 1n, d: 2n }, { n: 1n, d: 3n }) // { n: 5n, d: 6n }
 */
export function addRational(a: Rational, b: Rational): Rational {
	// a/c + b/d = (ad + bc) / cd
	const n = a.n * b.d + b.n * a.d;
	const d = a.d * b.d;
	return rational(n, d);
}

/**
 * Subtracts two rationals.
 *
 * @param a - First rational
 * @param b - Second rational
 * @returns a - b, reduced
 *
 * @example
 * subRational({ n: 1n, d: 2n }, { n: 1n, d: 3n }) // { n: 1n, d: 6n }
 */
export function subRational(a: Rational, b: Rational): Rational {
	// a/c - b/d = (ad - bc) / cd
	const n = a.n * b.d - b.n * a.d;
	const d = a.d * b.d;
	return rational(n, d);
}

/**
 * Multiplies two rationals.
 *
 * @param a - First rational
 * @param b - Second rational
 * @returns a * b, reduced
 *
 * @example
 * mulRational({ n: 2n, d: 3n }, { n: 3n, d: 4n }) // { n: 1n, d: 2n }
 */
export function mulRational(a: Rational, b: Rational): Rational {
	// Quick check for zero
	if (a.n === 0n || b.n === 0n) return ZERO;

	// (a/b) * (c/d) = ac/bd
	return rational(a.n * b.n, a.d * b.d);
}

/**
 * Divides two rationals.
 *
 * @param a - Dividend
 * @param b - Divisor (must not be zero)
 * @returns a / b, reduced
 * @throws Error if b is zero
 *
 * @example
 * divRational({ n: 2n, d: 3n }, { n: 4n, d: 5n }) // { n: 5n, d: 6n }
 */
export function divRational(a: Rational, b: Rational): Rational {
	if (b.n === 0n) {
		throw new Error('Rational: division by zero');
	}

	// Quick check for zero numerator
	if (a.n === 0n) return ZERO;

	// (a/b) / (c/d) = (ad) / (bc)
	return rational(a.n * b.d, a.d * b.n);
}

/**
 * Negates a rational.
 *
 * @param r - A rational
 * @returns -r
 *
 * @example
 * negRational({ n: 2n, d: 3n }) // { n: -2n, d: 3n }
 */
export function negRational(r: Rational): Rational {
	if (r.n === 0n) return ZERO;
	return { n: -r.n, d: r.d };
}

/**
 * Computes the absolute value of a rational.
 *
 * @param r - A rational
 * @returns |r|
 *
 * @example
 * absRational({ n: -2n, d: 3n }) // { n: 2n, d: 3n }
 */
export function absRational(r: Rational): Rational {
	if (r.n >= 0n) return r;
	return { n: -r.n, d: r.d };
}

/**
 * Computes the reciprocal (inverse) of a rational.
 *
 * @param r - A rational (must not be zero)
 * @returns 1/r
 * @throws Error if r is zero
 *
 * @example
 * reciprocal({ n: 2n, d: 3n }) // { n: 3n, d: 2n }
 */
export function reciprocal(r: Rational): Rational {
	if (r.n === 0n) {
		throw new Error('Rational: reciprocal of zero');
	}

	// Handle sign normalization
	if (r.n < 0n) {
		return { n: -r.d, d: -r.n };
	}
	return { n: r.d, d: r.n };
}

/**
 * Raises a rational to an integer power.
 *
 * @param base - The base rational
 * @param exp - The exponent (must be a safe integer)
 * @returns base^exp
 * @throws Error if 0^negative
 *
 * @example
 * powRational({ n: 2n, d: 3n }, 2)  // { n: 4n, d: 9n }
 * powRational({ n: 2n, d: 3n }, -1) // { n: 3n, d: 2n }
 */
export function powRational(base: Rational, exp: number): Rational {
	if (!Number.isInteger(exp)) {
		throw new Error('Rational: power exponent must be an integer');
	}

	// Handle special cases
	if (exp === 0) return ONE;
	if (exp === 1) return base;
	if (base.n === 0n) {
		if (exp < 0) throw new Error('Rational: 0 raised to negative power');
		return ZERO;
	}
	if (isOne(base)) return ONE;
	if (exp === -1) return reciprocal(base);

	// Handle negative exponent
	if (exp < 0) {
		base = reciprocal(base);
		exp = -exp;
	}

	// Compute power using repeated squaring
	let result = ONE;
	let current = base;
	let e = BigInt(exp);

	while (e > 0n) {
		if (e % 2n === 1n) {
			result = mulRational(result, current);
		}
		current = mulRational(current, current);
		e = e / 2n;
	}

	return result;
}

// =============================================================================
// Comparison Operations
// =============================================================================

/**
 * Compares two rationals.
 *
 * @param a - First rational
 * @param b - Second rational
 * @returns -1 if a < b, 0 if a = b, 1 if a > b
 *
 * @example
 * compareRational({ n: 1n, d: 3n }, { n: 1n, d: 2n }) // -1 (1/3 < 1/2)
 */
export function compareRational(a: Rational, b: Rational): ComparisonResult {
	// Compare a/c with b/d by comparing ad with bc
	const left = a.n * b.d;
	const right = b.n * a.d;

	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

/**
 * Checks if two rationals are equal.
 *
 * @param a - First rational
 * @param b - Second rational
 * @returns true if a = b
 */
export function equalRational(a: Rational, b: Rational): boolean {
	// Since rationals are always reduced, we can compare directly
	return a.n === b.n && a.d === b.d;
}

// =============================================================================
// Predicates
// =============================================================================

/**
 * Checks if a rational is zero.
 *
 * @param r - A rational
 * @returns true if r = 0
 */
export function isZero(r: Rational): boolean {
	return r.n === 0n;
}

/**
 * Checks if a rational is one.
 *
 * @param r - A rational
 * @returns true if r = 1
 */
export function isOne(r: Rational): boolean {
	return r.n === 1n && r.d === 1n;
}

/**
 * Checks if a rational is minus one.
 *
 * @param r - A rational
 * @returns true if r = -1
 */
export function isMinusOne(r: Rational): boolean {
	return r.n === -1n && r.d === 1n;
}

/**
 * Checks if a rational is negative.
 *
 * @param r - A rational
 * @returns true if r < 0
 */
export function isNegative(r: Rational): boolean {
	return r.n < 0n;
}

/**
 * Checks if a rational is positive.
 *
 * @param r - A rational
 * @returns true if r > 0
 */
export function isPositive(r: Rational): boolean {
	return r.n > 0n;
}

/**
 * Checks if a rational is an integer.
 *
 * @param r - A rational
 * @returns true if r has denominator 1
 */
export function isInteger(r: Rational): boolean {
	return r.d === 1n;
}

// =============================================================================
// Conversion
// =============================================================================

/**
 * Converts a rational to an approximate floating-point number.
 * May lose precision for very large numerators/denominators.
 *
 * @param r - A rational
 * @returns Approximate floating-point value
 *
 * @example
 * rationalToNumber({ n: 1n, d: 3n }) // 0.3333333333333333
 */
export function rationalToNumber(r: Rational): number {
	return Number(r.n) / Number(r.d);
}

/**
 * Converts a rational to a string representation.
 *
 * @param r - A rational
 * @returns String like "3/4" or "5" (if integer)
 */
export function rationalToString(r: Rational): string {
	if (r.d === 1n) {
		return r.n.toString();
	}
	return `${r.n}/${r.d}`;
}

/**
 * Parses a string into a rational.
 * Supports formats: "3", "-3", "3/4", "-3/4"
 *
 * @param s - String to parse
 * @returns A rational
 * @throws Error if string is invalid
 */
export function parseRational(s: string): Rational {
	const trimmed = s.trim();

	if (trimmed.includes('/')) {
		const [numStr, denStr] = trimmed.split('/');
		const n = BigInt(numStr.trim());
		const d = BigInt(denStr.trim());
		return rational(n, d);
	}

	return fromInteger(BigInt(trimmed));
}
