/**
 * MathAST Normal Form - Radical Operations
 *
 * Operations on simplified radicals (roots) using BigInt.
 * Handles simplification (extracting perfect factors) and multiplication.
 */

import type { SimplifiedRadical, SimplifiedRadicalResult, ComparisonResult } from './types';
import { gcd } from './rational';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Computes the integer n-th root of a BigInt, if it exists exactly.
 * Returns null if the result is not an integer.
 *
 * Uses Newton's method for BigInt.
 *
 * @param n - The number to take the root of
 * @param index - The root index (2 for sqrt, 3 for cbrt, etc.)
 * @returns The exact integer root, or null if not a perfect power
 *
 * @example
 * integerNthRoot(8n, 3n)   // 2n (cube root of 8)
 * integerNthRoot(9n, 2n)   // 3n (square root of 9)
 * integerNthRoot(10n, 2n)  // null (not a perfect square)
 */
export function integerNthRoot(n: bigint, index: bigint): bigint | null {
	if (n < 0n) {
		// Negative numbers: only odd roots work
		if (index % 2n === 0n) return null;
		const result = integerNthRoot(-n, index);
		return result !== null ? -result : null;
	}

	if (n === 0n) return 0n;
	if (n === 1n) return 1n;
	if (index === 1n) return n;

	// Newton's method for integer n-th root
	// Initial guess: use bit length estimation
	const bitLength = n.toString(2).length;
	let guess = 1n << BigInt(Math.ceil(bitLength / Number(index)));

	// Newton iteration: x_new = ((index-1)*x + n/x^(index-1)) / index
	const indexMinusOne = index - 1n;

	while (true) {
		// Compute guess^(index-1)
		let guessPower = 1n;
		for (let i = 0n; i < indexMinusOne; i++) {
			guessPower *= guess;
		}

		// Newton step
		const newGuess = (indexMinusOne * guess + n / guessPower) / index;

		if (newGuess >= guess) {
			// Converged, check if exact
			let check = 1n;
			for (let i = 0n; i < index; i++) {
				check *= guess;
			}
			return check === n ? guess : null;
		}

		guess = newGuess;
	}
}

/**
 * Finds the largest integer k such that k^index divides n.
 * Returns the pair (k, n/k^index).
 *
 * @param n - The number to factor
 * @param index - The root index
 * @returns [extracted, remaining] where n = extracted^index * remaining
 *
 * @example
 * extractPerfectPower(18n, 2n)  // [3n, 2n] since 18 = 9*2 = 3^2 * 2
 * extractPerfectPower(27n, 3n)  // [3n, 1n] since 27 = 27*1 = 3^3 * 1
 * extractPerfectPower(5n, 2n)   // [1n, 5n] since 5 = 1*5 = 1^2 * 5
 */
export function extractPerfectPower(n: bigint, index: bigint): [bigint, bigint] {
	if (n <= 1n) return [1n, n];

	let extracted = 1n;
	let remaining = n;

	// Trial division by small primes, then by larger numbers
	const smallPrimes = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];

	for (const p of smallPrimes) {
		if (p * p > remaining) break;

		// Count how many times p divides remaining
		let count = 0n;
		while (remaining % p === 0n) {
			remaining /= p;
			count++;
		}

		// Extract complete index-th powers of p
		const completeGroups = count / index;
		const leftover = count % index;

		// Add completeGroups * index powers back to extracted
		for (let i = 0n; i < completeGroups; i++) {
			extracted *= p;
		}

		// Add leftover powers back to remaining
		for (let i = 0n; i < leftover; i++) {
			remaining *= p;
		}
	}

	// Handle any remaining large factors
	// If remaining > 1 and is a perfect power, extract it
	if (remaining > 1n) {
		let factor = 41n; // Continue from where small primes left off
		while (factor * factor <= remaining) {
			let count = 0n;
			while (remaining % factor === 0n) {
				remaining /= factor;
				count++;
			}

			const completeGroups = count / index;
			const leftover = count % index;

			for (let i = 0n; i < completeGroups; i++) {
				extracted *= factor;
			}

			for (let i = 0n; i < leftover; i++) {
				remaining *= factor;
			}

			factor += 2n; // Only odd numbers after 41
		}
	}

	return [extracted, remaining];
}

// =============================================================================
// Radical Simplification
// =============================================================================

/**
 * Simplifies a radical by extracting perfect powers.
 *
 * For a radical n^(1/index), finds coefficient and simplified radicand
 * such that n^(1/index) = coefficient * radicand^(1/index)
 * where radicand has no extractable index-th power factors.
 *
 * @param n - The radicand (must be positive)
 * @param index - The root index (must be >= 2)
 * @returns The simplified radical result
 * @throws Error if n is not positive or index < 2
 *
 * @example
 * simplifyRadical(18n, 2n)  // { coefficient: 3n, radicand: 2n } since sqrt(18) = 3*sqrt(2)
 * simplifyRadical(4n, 2n)   // { coefficient: 2n, radicand: 1n } since sqrt(4) = 2
 * simplifyRadical(27n, 3n)  // { coefficient: 3n, radicand: 1n } since cbrt(27) = 3
 * simplifyRadical(5n, 2n)   // { coefficient: 1n, radicand: 5n } since sqrt(5) is already simplified
 */
export function simplifyRadical(n: bigint, index: bigint): SimplifiedRadicalResult {
	if (n <= 0n) {
		throw new Error('simplifyRadical: radicand must be positive');
	}
	if (index < 2n) {
		throw new Error('simplifyRadical: index must be at least 2');
	}

	// Special case: radicand is 1
	if (n === 1n) {
		return { coefficient: 1n, radicand: 1n };
	}

	// Check if n is itself a perfect power
	const exactRoot = integerNthRoot(n, index);
	if (exactRoot !== null) {
		return { coefficient: exactRoot, radicand: 1n };
	}

	// Extract perfect power factors
	const [coefficient, radicand] = extractPerfectPower(n, index);

	return { coefficient, radicand };
}

/**
 * Creates a SimplifiedRadical from radicand and index.
 * First simplifies to ensure invariants are maintained.
 *
 * Returns null if the result is a pure rational (radicand = 1).
 *
 * @param radicand - The number under the radical
 * @param index - The root index
 * @returns The simplified radical, or null if result is rational
 *
 * @example
 * createRadical(2n, 2n)   // { radicand: 2n, index: 2n }
 * createRadical(4n, 2n)   // null (since sqrt(4) = 2, a rational)
 * createRadical(18n, 2n)  // null with coefficient 3 (need to handle separately)
 */
export function createRadical(radicand: bigint, index: bigint): SimplifiedRadical | null {
	const result = simplifyRadical(radicand, index);

	if (result.radicand === 1n) {
		// Result is purely rational (coefficient * 1)
		return null;
	}

	return { radicand: result.radicand, index };
}

// =============================================================================
// Radical Multiplication
// =============================================================================

/**
 * Result of multiplying two radicals.
 * Contains the rational coefficient and optional remaining radical.
 */
export interface RadicalMultiplyResult {
	/** The rational coefficient extracted */
	readonly coefficient: bigint;
	/** The remaining radical, or null if result is purely rational */
	readonly radical: SimplifiedRadical | null;
}

/**
 * Multiplies two simplified radicals with the same index.
 *
 * For radicals a^(1/index) * b^(1/index) = (a*b)^(1/index),
 * then simplifies the result.
 *
 * @param a - First radical
 * @param b - Second radical
 * @returns The multiplication result
 * @throws Error if indices don't match
 *
 * @example
 * // sqrt(2) * sqrt(3) = sqrt(6)
 * mulRadicalsSameIndex({ radicand: 2n, index: 2n }, { radicand: 3n, index: 2n })
 * // { coefficient: 1n, radical: { radicand: 6n, index: 2n } }
 *
 * // sqrt(2) * sqrt(2) = 2
 * mulRadicalsSameIndex({ radicand: 2n, index: 2n }, { radicand: 2n, index: 2n })
 * // { coefficient: 2n, radical: null }
 *
 * // sqrt(2) * sqrt(8) = sqrt(16) = 4
 * mulRadicalsSameIndex({ radicand: 2n, index: 2n }, { radicand: 8n, index: 2n })
 * // { coefficient: 4n, radical: null }
 */
export function mulRadicalsSameIndex(
	a: SimplifiedRadical,
	b: SimplifiedRadical
): RadicalMultiplyResult {
	if (a.index !== b.index) {
		throw new Error('mulRadicalsSameIndex: indices must match');
	}

	const product = a.radicand * b.radicand;
	const simplified = simplifyRadical(product, a.index);

	if (simplified.radicand === 1n) {
		return { coefficient: simplified.coefficient, radical: null };
	}

	return {
		coefficient: simplified.coefficient,
		radical: { radicand: simplified.radicand, index: a.index }
	};
}

/**
 * Multiplies two simplified radicals, potentially with different indices.
 *
 * For radicals a^(1/m) * b^(1/n), converts to common index lcm(m,n)
 * then multiplies.
 *
 * @param a - First radical
 * @param b - Second radical
 * @returns The multiplication result
 *
 * @example
 * // sqrt(2) * cbrt(2) = 2^(1/2) * 2^(1/3) = 2^(5/6) = 2^(5/6)
 * // This is more complex, returns common representation
 */
export function mulRadicals(a: SimplifiedRadical, b: SimplifiedRadical): RadicalMultiplyResult {
	// If same index, use optimized version
	if (a.index === b.index) {
		return mulRadicalsSameIndex(a, b);
	}

	// Find common index (LCM)
	const g = gcd(a.index, b.index);
	const commonIndex = (a.index * b.index) / g;

	// Convert a to common index: a^(1/m) = a^(k/mk) where k = commonIndex/m
	const aMultiplier = commonIndex / a.index;
	const bMultiplier = commonIndex / b.index;

	// a^(1/m) = (a^k)^(1/commonIndex)
	// b^(1/n) = (b^l)^(1/commonIndex)
	let aNewRadicand = 1n;
	for (let i = 0n; i < aMultiplier; i++) {
		aNewRadicand *= a.radicand;
	}

	let bNewRadicand = 1n;
	for (let i = 0n; i < bMultiplier; i++) {
		bNewRadicand *= b.radicand;
	}

	// Now multiply in the common index
	const product = aNewRadicand * bNewRadicand;
	const simplified = simplifyRadical(product, commonIndex);

	if (simplified.radicand === 1n) {
		return { coefficient: simplified.coefficient, radical: null };
	}

	// Try to simplify the index
	const _indexGcd = gcd(
		commonIndex,
		BigInt(Math.floor(Math.log2(Number(simplified.radicand)) + 1))
	);
	// For now, keep the common index
	// A full implementation would try to reduce the index

	return {
		coefficient: simplified.coefficient,
		radical: { radicand: simplified.radicand, index: commonIndex }
	};
}

// =============================================================================
// Radical Comparison
// =============================================================================

/**
 * Compares two simplified radicals for canonical ordering.
 *
 * Order:
 * 1. By index (ascending): sqrt < cbrt < fourth root
 * 2. By radicand (ascending): sqrt(2) < sqrt(3) < sqrt(5)
 *
 * @param a - First radical
 * @param b - Second radical
 * @returns -1 if a < b, 0 if a = b, 1 if a > b
 *
 * @example
 * compareRadicals({ radicand: 2n, index: 2n }, { radicand: 3n, index: 2n }) // -1 (sqrt(2) < sqrt(3))
 * compareRadicals({ radicand: 2n, index: 2n }, { radicand: 2n, index: 3n }) // -1 (sqrt(2) < cbrt(2))
 */
export function compareRadicals(a: SimplifiedRadical, b: SimplifiedRadical): ComparisonResult {
	// Compare by index first (ascending)
	if (a.index < b.index) return -1;
	if (a.index > b.index) return 1;

	// Same index, compare by radicand (ascending)
	if (a.radicand < b.radicand) return -1;
	if (a.radicand > b.radicand) return 1;

	return 0;
}

/**
 * Checks if two simplified radicals are equal.
 *
 * @param a - First radical
 * @param b - Second radical
 * @returns true if a and b represent the same radical
 */
export function equalRadicals(a: SimplifiedRadical, b: SimplifiedRadical): boolean {
	return a.index === b.index && a.radicand === b.radicand;
}

/**
 * Computes the approximate numeric value of a radical.
 *
 * @param r - A simplified radical
 * @returns Approximate floating-point value
 */
export function radicalToNumber(r: SimplifiedRadical): number {
	return Math.pow(Number(r.radicand), 1 / Number(r.index));
}

/**
 * Converts a radical to a string representation.
 *
 * @param r - A simplified radical
 * @returns String like "sqrt(2)" or "cbrt(5)" or "root[4](3)"
 */
export function radicalToString(r: SimplifiedRadical): string {
	if (r.index === 2n) {
		return `sqrt(${r.radicand})`;
	}
	if (r.index === 3n) {
		return `cbrt(${r.radicand})`;
	}
	return `root[${r.index}](${r.radicand})`;
}

/**
 * Creates a hash string for a radical (for canonical ordering and equality).
 *
 * @param r - A simplified radical
 * @returns A deterministic hash string
 */
export function hashRadical(r: SimplifiedRadical): string {
	return `R${r.index}:${r.radicand}`;
}
