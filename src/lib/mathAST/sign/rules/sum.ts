/**
 * Sum Sign Rules
 *
 * Determines the sign of a sum based on the signs of its terms.
 *
 * For sums, we can only determine the sign when all non-zero terms have the same sign:
 * - All positive terms -> positive result
 * - All negative terms -> negative result
 * - Mixed signs or any unknown -> unknown result
 * - All zero -> zero result
 *
 * Note: This is a conservative approach. More sophisticated analysis
 * could determine signs in cases like "3 + (-2)" by computing bounds.
 *
 * @module mathAST/sign/rules/sum
 */

import type { Sign } from '../types';

/**
 * Determines the sign of a sum when all terms have the same sign.
 *
 * This function uses a conservative approach:
 * - If all non-zero terms share the same sign, that's the result
 * - If there are mixed signs, the result is unknown
 * - Empty sum is zero (additive identity)
 *
 * @param signs - The signs of all terms in the sum
 * @returns The sign of the sum
 *
 * @example
 * signOfSum(['positive', 'positive']) // => 'positive'
 * signOfSum(['negative', 'negative', 'zero']) // => 'negative'
 * signOfSum(['positive', 'negative']) // => 'unknown'
 * signOfSum([]) // => 'zero'
 */
export function signOfSum(signs: readonly Sign[]): Sign {
	// Empty sum is 0 (additive identity)
	if (signs.length === 0) {
		return 'zero';
	}

	// Find the common sign ignoring zeros
	const nonZeroSigns = signs.filter((s) => s !== 'zero');

	// If all terms are zero, the sum is zero
	if (nonZeroSigns.length === 0) {
		return 'zero';
	}

	// If any term is unknown, the sum is unknown
	if (nonZeroSigns.some((s) => s === 'unknown')) {
		return 'unknown';
	}

	// Check if all non-zero terms have the same sign
	const commonSign = allSameSign(nonZeroSigns);

	// If all terms share the same sign, that's the result
	if (commonSign !== null) {
		return commonSign;
	}

	// Mixed signs: we cannot determine the result without computing values
	return 'unknown';
}

/**
 * Checks if all signs in the array are the same (ignoring 'zero' values).
 *
 * Returns the common sign if all are the same, or null if there are mixed signs.
 * Does not consider 'unknown' - caller should filter those first.
 *
 * @param signs - Array of signs to check
 * @returns The common sign if all are the same, null otherwise
 *
 * @example
 * allSameSign(['positive', 'positive']) // => 'positive'
 * allSameSign(['negative', 'zero', 'negative']) // => 'negative'
 * allSameSign(['positive', 'negative']) // => null
 * allSameSign([]) // => null
 */
export function allSameSign(signs: readonly Sign[]): Sign | null {
	// Filter out zeros for this check
	const nonZeroSigns = signs.filter((s) => s !== 'zero');

	if (nonZeroSigns.length === 0) {
		return null;
	}

	const firstSign = nonZeroSigns[0];

	// Check if all signs match the first one
	for (const sign of nonZeroSigns) {
		if (sign !== firstSign) {
			return null;
		}
	}

	return firstSign;
}

/**
 * Determines the sign of a difference: a - b
 *
 * Uses the relationship a - b = a + (-b), so we flip the sign of b.
 *
 * This is a convenience function for simple two-term differences.
 * For more complex expressions, use signOfSum with manually negated signs.
 *
 * @param signA - The sign of the first term
 * @param signB - The sign of the second term (will be negated)
 * @returns The sign of the difference a - b
 *
 * @example
 * signOfDifference('positive', 'positive') // => 'unknown' (can't determine without values)
 * signOfDifference('positive', 'negative') // => 'positive' (positive + positive)
 * signOfDifference('negative', 'positive') // => 'negative' (negative + negative)
 */
export function signOfDifference(signA: Sign, signB: Sign): Sign {
	// Negate the second sign
	const negatedB = negateSign(signB);

	// Use sum rules
	return signOfSum([signA, negatedB]);
}

/**
 * Negates a sign: positive <-> negative, zero stays zero, unknown stays unknown.
 *
 * @param sign - The sign to negate
 * @returns The negated sign
 */
export function negateSign(sign: Sign): Sign {
	switch (sign) {
		case 'positive':
			return 'negative';
		case 'negative':
			return 'positive';
		case 'zero':
			return 'zero';
		case 'unknown':
			return 'unknown';
	}
}
